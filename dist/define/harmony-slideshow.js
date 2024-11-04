import {HTMLHarmonySlideshowElement, styleInject} from '../index.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`:host{align-items:center;display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative}.image{flex-shrink:0;position:relative}.images{flex:1;overflow:hidden;width:100%}.images-outer{margin:auto;overflow:hidden}.images-inner{display:flex;height:100%;position:relative;width:100%}:host(.dynamic) .images-inner{transition:all .5s ease 0s}.controls{display:none;height:100%;opacity:0;position:absolute;width:100%;z-index:1000}:host(.dynamic) .controls{display:unset}.controls>div{background-position:50%;background-repeat:no-repeat;background-size:100%;cursor:pointer;pointer-events:all;position:absolute}.next-image,.previous-image{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23fff;stroke:%23000;stroke-width:10' d='m360 100-60-70L30 256l270 226 60-70-185-156Z'/%3E%3C/svg%3E");height:48px;top:calc(50% - 24px);width:48px}.previous-image{left:10px}.next-image{right:10px;transform:scaleX(-1)}.pause,.play{bottom:10px;height:25px;left:10px;width:25px}.play{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23fff;stroke:%23000;stroke-width:40' d='m20 20 450 236L20 492Z'/%3E%3C/svg%3E")}.pause{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cg style='fill:%23fff;stroke:%23000;stroke-width:30'%3E%3Cpath d='M30 30h140v452H30zM342 30h140v452H342z'/%3E%3C/g%3E%3C/svg%3E");right:0}.thumbnails{display:flex;flex:0;justify-content:center;width:100%}:host(.dynamic) .thumbnails{display:none}.thumbnails>img{cursor:pointer;height:80px;margin:3px;object-fit:contain}.zoom{height:100%;pointer-events:none;position:fixed;width:100%}.zoom>img{position:relative;width:100%;width:1500px}`);
	customElements.define('harmony-slideshow', HTMLHarmonySlideshowElement);
}