// Tiny test double for application state/events; deliberately NOT a browser or layout renderer.
export class MockNode {
  constructor(tag='',doc=null){this.tagName=tag.toUpperCase();this.doc=doc;this.attributes={};this.children=[];this.parentNode=null;this.listeners={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this._text='';this.dataset={};this.classList={add:(...names)=>this.classes(names,true),remove:(...names)=>this.classes(names,false),toggle:(name,force)=>{const set=new Set((this.attributes.class||'').split(/\s+/).filter(Boolean));const on=force??!set.has(name);if(on)set.add(name);else set.delete(name);this.attributes.class=[...set].join(' ');return on;},contains:name=>(this.attributes.class||'').split(/\s+/).includes(name)};}
  classes(names,on){for(const name of names)this.classList.toggle(name,on);}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.doc?.ids.set(String(value),this);if(key==='value')this.value=String(value);if(key==='checked')this.checked=true;if(key==='disabled')this.disabled=true;if(key==='hidden')this.hidden=true;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  append(...nodes){for(let n of nodes){if(typeof n==='string')n=this.doc.createTextNode(n);n.parentNode=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
  set textContent(text){this._text=String(text);this.children=[];}
  addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
  async emit(type){const event={type,target:this,preventDefault(){},key:type==='keydown'?'Enter':undefined};for(const handler of this.listeners[type]??[])await handler(event);}
  click(){this.doc.clicked.push(this);return this.emit('click');}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);}
  scrollIntoView(){this.doc.scrolled=this;}
}
export function createDocument(html){
  const doc={ids:new Map(),clicked:[],hidden:false,listeners:{},createElement:tag=>new MockNode(tag,doc),createElementNS:(_,tag)=>new MockNode(tag,doc),createTextNode:text=>{const n=new MockNode('',doc);n._text=text;return n;},getElementById:id=>doc.ids.get(id),addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}};
  const root=new MockNode('document',doc),stack=[root],voids=new Set(['meta','link','img','input','br','hr']);
  for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){if(token.startsWith('<!'))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<')){const match=token.match(/^<([\w-]+)/);if(!match)continue;const tag=match[1],node=doc.createElement(tag);const content=token.slice(match[0].length,-1);for(const attr of content.matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g))node.setAttribute(attr[1],attr[2]??attr[3]??attr[4]??'');stack.at(-1).append(node);if(tag==='body')doc.body=node;if(!voids.has(tag)&&!token.endsWith('/>'))stack.push(node);}else stack.at(-1).append(doc.createTextNode(token));}
  const walk=node=>[node,...node.children.flatMap(walk)];
  for(const node of walk(root)){if(node.tagName==='TEXTAREA')node.value=node.textContent;if(node.tagName==='SELECT')node.value=node.children.find(n=>n.tagName==='OPTION')?.value??'';}
  doc.querySelectorAll=selector=>{const m=selector.match(/^\[([^\]]+)\](:checked)?$/);if(!m)throw new Error('Unsupported mock selector: '+selector);return walk(root).filter(node=>Object.hasOwn(node.attributes,m[1])&&(!m[2]||node.checked));};
  return doc;
}
