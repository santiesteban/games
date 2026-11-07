// Render the upstream neobrutalism.dev components into the existing editor
// before its event handlers are attached. The editor keeps native DOM ownership.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server.browser';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';

const names={class:'className',tabindex:'tabIndex',autocomplete:'autoComplete',maxlength:'maxLength',inputmode:'inputMode',spellcheck:'spellCheck',formnovalidate:'formNoValidate',readonly:'readOnly'};
function attributes(element){
  const props={};
  for(const {name,value} of element.attributes){
    if(name==='style')continue;
    const key=names[name]||name;
    props[key]=['disabled','hidden','required','readOnly','formNoValidate'].includes(key)?true:value;
  }
  return props;
}
function nodeFromMarkup(markup){const template=document.createElement('template');template.innerHTML=markup;return template.content.firstElementChild}
export function neoButton(element){
  const props=attributes(element);
  if(!props.type)props.type=element.closest('form')?'submit':'button';
  props.variant=element.classList.contains('primary')?'default':'neutral';
  props.size=element.classList.contains('icon-button')||element.classList.contains('tool')?'icon':'default';
  props.dangerouslySetInnerHTML={__html:element.innerHTML};
  const result=nodeFromMarkup(renderToStaticMarkup(React.createElement(Button,props)));
  result.style.cssText=element.style.cssText;
  return result;
}
function neoInput(element){return nodeFromMarkup(renderToStaticMarkup(React.createElement(Input,attributes(element))))}
export function installNeoComponents(root=document){
  for(const element of root.querySelectorAll('button'))element.replaceWith(neoButton(element));
  for(const element of root.querySelectorAll('input:not([type]),input[type="text"],input[type="url"],input[type="email"]'))element.replaceWith(neoInput(element));
}
