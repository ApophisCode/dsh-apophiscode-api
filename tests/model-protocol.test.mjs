import assert from 'node:assert/strict'
import test from 'node:test'
import { createModelProtocolResolver, PROTOCOL_PROBE_TEXT } from '../src/model-protocol.js'
import { createRouteAdapter } from '../src/route.js'
import { createPluginHost, textOf } from './plugin-host-fixture.mjs'
import { chatFrames, eventStream, responseFrames } from './fixtures/openai.mjs'

const host='https://gateway.example/root', key='sk-offline-protocol-a', id='opaque-new-model/2040'
const good=()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]})
const metadata=()=>({apiHost:host,key,id})

test('unknown ID passes registered adapter, independent verification, business text and real ToolRuntime continuation', async t=>{
  const probes=[]
  const plugin=await createPluginHost(t,{ modelIds:[id], respond:call=>{
    if(call.body.stream!==true){probes.push(call);return good()}
    const business=call.index-probes.length
    return eventStream(responseFrames(id,business===1?{tool:{id:'call_dynamic',name:'lookup_memory',argumentsParts:['{"query":"新型号"}']}}:{textParts:['已读取新型号。']}))
  }})
  assert.deepEqual((await plugin.adapter.listModels('apophiscode')).map(m=>m.id),[id])
  assert.deepEqual(await plugin.adapter.resolveModel('apophiscode',id),{provider:'apophiscode',id,name:id})
  await plugin.adapter.prepareCall('apophiscode',id)
  const result=await plugin.toolRoundTrip({model:id,expectedArguments:{query:'新型号'}})
  assert.equal(textOf(result.second),'已读取新型号。')
  assert.equal(probes.length,1)
  assert.equal(probes[0].body.input[0].content[0].text,PROTOCOL_PROBE_TEXT)
  assert.equal(JSON.stringify(probes[0].body).includes('读取内存'),false)
  assert.equal(result.first.finish.kind,'tool-calls')
  for(const call of plugin.requests)assert.equal(call.body.model,id)
  const info=await plugin.adapter.resolveModel('apophiscode',id)
  assert.equal(info.context,undefined);assert.equal(info.reasoning,undefined);assert.equal(info.inputModalities,undefined)
})

test('verification evidence is isolated by exact key, host and ID; same identity deduplicates',async()=>{
  let count=0
  const resolver=createModelProtocolResolver({fetchImpl:async()=>{count++;return good()}})
  await Promise.all(Array.from({length:5},()=>resolver.resolve(metadata())))
  assert.equal(count,1)
  for(const patch of [{key:'sk-offline-protocol-b'},{apiHost:'https://elsewhere.example'},{id:id+'-dated'}]) await resolver.resolve({...metadata(),...patch})
  assert.equal(count,4)
  await resolver.resolve(metadata());assert.equal(count,4)
})

test('one aborted waiter does not cancel shared verification or another waiter',async()=>{
  let release
  const resolver=createModelProtocolResolver({fetchImpl:()=>new Promise(resolve=>{release=()=>resolve(good())})})
  const controller=new AbortController()
  const a=resolver.resolve({...metadata(),signal:controller.signal}), b=resolver.resolve(metadata())
  controller.abort(new Error('cancelled waiter'))
  await assert.rejects(a,/cancelled waiter/u)
  release();assert.equal((await b).api,'openai-responses')
})

test('only explicit protocol rejection advances an independent probe',async()=>{
  const paths=[]
  const resolver=createModelProtocolResolver({fetchImpl:async(url,init)=>{
    assert.equal(init.redirect,'error');paths.push(new URL(url).pathname)
    return paths.length===1?Response.json({error:{message:'Responses protocol is not supported'}},{status:400})
      :Response.json({type:'message',content:[{type:'text',text:'OK'}]})
  }})
  assert.equal((await resolver.resolve(metadata())).api,'anthropic-messages')
  assert.deepEqual(paths,['/root/v1/responses','/root/v1/messages'])
})
for(const status of [401,403,404,429,500,502]) test(`HTTP ${status} never changes protocol on an ambiguous failure`,async()=>{
  let count=0
  const resolver=createModelProtocolResolver({fetchImpl:async()=>{count++;return Response.json({error:{message:'request failed'}},{status})}})
  await assert.rejects(resolver.resolve(metadata()),/verification failed/u)
  assert.equal(count,1)
})
test('invalid success, transport errors and unreadable bodies never switch protocols',async()=>{
  for(const response of [()=>Response.json({ok:true}),()=>{throw new Error('network')},()=>new Response('invalid json')]){
    let count=0;const resolver=createModelProtocolResolver({fetchImpl:async()=>{count++;return response()}})
    await assert.rejects(resolver.resolve(metadata()),/verification/u);assert.equal(count,1)
  }
})

test('verification reports the failing endpoint and a safe transport category without echoing errors', async () => {
  let count = 0
  const resolver = createModelProtocolResolver({ fetchImpl: async () => {
    count += 1
    throw new TypeError(`fetch failed with ${key}`, { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })
  } })
  await assert.rejects(resolver.resolve(metadata()), error => {
    assert.match(error.message, /connection timed out/iu)
    assert.match(error.message, /POST \/v1\/responses/u)
    assert.match(error.message, /UND_ERR_CONNECT_TIMEOUT/u)
    assert.equal(error.message.includes(key), false)
    assert.equal(error.stage, 'response-headers')
    assert.equal(error.code, 'APOPHISCODE_PROTOCOL_CONNECT_TIMEOUT')
    return true
  })
  assert.equal(count, 1)
  assert.equal(resolver.peek(metadata()), undefined)
})

test('registered adapter surfaces verification failures before any conversation POST', async t => {
  const plugin = await createPluginHost(t, { modelIds: [id], respond: () => {
    throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })
  } })
  await assert.rejects(plugin.adapter.prepareCall('apophiscode', id), error => error.code === 'APOPHISCODE_PROTOCOL_CONNECT_TIMEOUT')
  assert.equal(plugin.requests.length, 1)
  assert.equal(plugin.requests[0].body.model, id)
  assert.equal(plugin.requests[0].body.stream, undefined)
  assert.equal(plugin.requests[0].body.input[0].content[0].text, PROTOCOL_PROBE_TEXT)
})

test('gateway rejection retains the redacted cause and invalid HTTP 200 is distinct', async () => {
  for (const status of [200, 502]) {
    const resolver = createModelProtocolResolver({ fetchImpl: async () => Response.json({ error: { message: `upstream rejected ${key}` } }, { status }) })
    await assert.rejects(resolver.resolve(metadata()), error => {
      assert.equal(error.code, status === 200 ? 'APOPHISCODE_PROTOCOL_INVALID_RESPONSE' : 'APOPHISCODE_PROTOCOL_HTTP')
      assert.equal(error.stage, 'response-validation')
      assert.equal(error.status, status)
      assert.match(error.message, /upstream rejected/u)
      assert.equal(error.message.includes(key), false)
      return true
    })
  }
})
test('gateway declaration avoids a probe and retains capacity, modalities and efforts',async()=>{
  const resolver=createModelProtocolResolver({fetchImpl:()=>assert.fail('declared protocol does not probe')})
  const result=await resolver.resolve({...metadata(),row:{api:'anthropic-messages',context_window:123,input_modalities:['text','image'],reasoning_efforts:['high']}})
  assert.equal(result.contextWindow,123);assert.deepEqual(result.input,['text','image']);assert.deepEqual(result.reasoningEfforts,{high:'high'})
})
test('text evidence cannot overwrite gateway input declarations',async()=>{
  const resolver=createModelProtocolResolver({fetchImpl:async()=>good()})
  for(let i=0;i<2;i++)assert.deepEqual((await resolver.resolve({...metadata(),row:{input_modalities:['text','image']}})).input,['text','image'])
})
test('prepared call keeps its credential and host snapshot after active settings change',async t=>{
  let active={id:'a',key}, target=host
  const seen=[]
  const adapter=createRouteAdapter({ring:{activeKey:async()=>active},keys:{active:async()=>active},getApiHost:()=>target,
    availableModels:async()=>[{id,api:'openai-responses'}]})
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    seen.push({url,authorization:new Headers(init.headers).get('authorization')})
    return eventStream(responseFrames(id,{textParts:['done']}))
  })
  const prepared=await adapter.prepareCall('apophiscode',id)
  active={id:'b',key:'sk-offline-protocol-b'};target='https://changed.example'
  for await(const chunk of prepared.stream({provider:'apophiscode',model:id,messages:[],tools:[]}))void chunk
  assert.equal(seen.length,1);assert.equal(seen[0].authorization,`Bearer ${key}`);assert.equal(seen[0].url,host+'/v1/responses')
})
test('business failure is returned once without switching protocol or substituting model',async t=>{
  const plugin=await createPluginHost(t,{modelIds:[{id,api:'openai-responses'}],respond:()=>Response.json({error:{message:'unsupported request'}},{status:400})})
  const result=await plugin.turn({model:id})
  assert.equal(result.assembled.finish.kind,'error');assert.equal(plugin.requests.length,1);assert.equal(plugin.requests[0].body.model,id)
})

test('verification bounds stalled and oversized bodies and can retry after failure', async () => {
  for (const oversized of [true, false]) {
    let count = 0, cancelled = false
    const keepAlive = setTimeout(() => {}, 1000)
    try {
      const resolver = createModelProtocolResolver({ timeoutMs: 20, fetchImpl: async () => {
        if (++count > 1) return good()
        return new Response(new ReadableStream({ start(controller) {
          controller.enqueue(new TextEncoder().encode(oversized ? 'x'.repeat(65537) : '{'))
        }, cancel() { cancelled = true } }))
      } })
      await assert.rejects(resolver.resolve(metadata()), error => {
        assert.equal(error.code, oversized ? 'APOPHISCODE_PROTOCOL_RESPONSE_TOO_LARGE' : 'APOPHISCODE_PROTOCOL_TIMEOUT')
        assert.equal(error.stage, 'response-body')
        assert.match(error.message, /POST \/v1\/responses/u)
        assert.equal(/gateway is reachable/u.test(error.message), false)
        return true
      })
      assert.equal(cancelled, true)
      assert.equal(count, 1)
      assert.equal(resolver.peek(metadata()), undefined)
      assert.equal((await resolver.resolve(metadata())).api, 'openai-responses')
    } finally { clearTimeout(keepAlive) }
  }
})

test('non-JSON explicit endpoint refusals may advance, and Google uses its protocol auth', async () => {
  const seen = []
  const resolver = createModelProtocolResolver({ fetchImpl: async (url, init) => {
    const headers = new Headers(init.headers)
    seen.push(new URL(url).pathname)
    if (seen.length < 4) return new Response('endpoint disabled', { status: 405 })
    assert.equal(headers.get('x-goog-api-key'), key)
    assert.equal(headers.has('authorization'), false)
    assert.ok(seen.at(-1).includes(encodeURIComponent(id)))
    return Response.json({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
  } })
  assert.equal((await resolver.resolve(metadata())).api, 'google-generative-ai')
  assert.equal(seen.length, 4)
})


test('protocol evidence expires and shared verification preserves each caller declaration', async () => {
  let time = 100, calls = 0, release
  const resolver = createModelProtocolResolver({ ttlMs: 100, now: () => time, fetchImpl: async () => {
    calls += 1
    if (calls === 1) await new Promise(resolve => { release = resolve })
    return good()
  } })
  const text = resolver.resolve({ ...metadata(), row: { input_modalities: ['text'] } })
  const image = resolver.resolve({ ...metadata(), row: { input_modalities: ['text', 'image'] } })
  release()
  assert.deepEqual((await text).input, ['text'])
  assert.deepEqual((await image).input, ['text', 'image'])
  assert.equal(calls, 1)
  time += 100
  assert.equal(resolver.peek(metadata()), undefined)
  await resolver.resolve(metadata())
  assert.equal(calls, 2)
})

test('unknown image input and undeclared effort fail before a business POST', async t => {
  const plugin = await createPluginHost(t, { modelIds: [{ id, api: 'openai-responses' }], respond: () => assert.fail('no business POST') })
  const prepared = await plugin.adapter.prepareCall('apophiscode', id)
  for (const reasoningEffort of ['high', 'toString']) assert.throws(() => prepared.stream({
    provider: 'apophiscode', model: id, reasoningEffort, messages: [],
  }), error => error.code === 'UNSUPPORTED_REASONING_EFFORT')
  assert.throws(() => prepared.stream({ provider: 'apophiscode', model: id,
    messages: [{ role: 'user', content: [{ type: 'image', data: 'test' }] }],
  }), error => error.code === 'UNSUPPORTED_CONTENT')
  assert.equal(plugin.requests.length, 0)
})


test('an arbitrary Chat Completions declaration uses server reasoning defaults and the real tool loop', async t => {
  const plugin = await createPluginHost(t, { modelIds: [{ id, api: 'openai-completions', reasoning_efforts: ['off', 'high'] }],
    respond: call => eventStream(chatFrames(id, call.index === 1 ? {
      tool: { id: 'call_chat', name: call.body.tools[0].function.name, argumentsParts: ['{"query":"原始型号"}'] },
    } : { textParts: ['读取成功。'] })),
  })
  const result = await plugin.toolRoundTrip({ model: id, expectedArguments: { query: '原始型号' } })
  assert.equal(textOf(result.second), '读取成功。')
  assert.equal(result.executed, 1)
  assert.ok(plugin.requests.every(call => call.url.endsWith('/v1/chat/completions') && call.body.model === id && call.body.reasoning_effort === undefined))
})
