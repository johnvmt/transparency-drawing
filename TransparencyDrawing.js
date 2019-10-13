class TransparencyDrawing extends HTMLElement {

	constructor() {
		super(); // Always call super first in constructor

		// Gets content from <template>
		const shadow = this.attachShadow({mode: 'open'});

		shadow.innerHTML = `<style>
			:host {
				display: block;
				height: 100%;
				width: 100%;
			}
		</style>
		<div style="width: 100%; height: 100%;">
			<svg style="position: absolute; top: 0; left: 0; z-index: 1; width: 100%; height: 100%;" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<filter id="drop-shadow">
						<feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/>
						<feOffset dx="1" dy="1" result="offsetblur"/>
						<feFlood flood-color="rgba(0,0,0,0.5)"/>
						<feComposite in2="offsetblur" operator="in"/>
						<feMerge>
							<feMergeNode/>
							<feMergeNode in="SourceGraphic"/>
						</feMerge>
					</filter>
				</defs>
				<g id="drawings"></g>
			</svg>
			<slot style="position: relative; top: -100%; left: 0; z-index: 0; width: 100%; height: 100%;"></slot>
		</div>`;

		this._elements = {
			svg: shadow.querySelector('svg')
		};

		this._paths = {};
		this._images = {};

		this._eventHandlers = [];
	}

	connectedCallback() {
		this._elements.drawings = this.shadowRoot.querySelector('svg #drawings');
		this.passthrough(this.getAttribute('passthrough'));
	}

	static get observedAttributes() {
		return ['passthrough'];
	}

	attributeChangedCallback(attributeName, oldVal, newVal) {
		if(attributeName === 'passthrough' && oldVal !== newVal)
			this.passthrough(newVal);
	};

	clear(mirrorTag) {
		let drawingsNode = this._elements.drawings;
		while (drawingsNode.firstChild) {
			drawingsNode.removeChild(drawingsNode.firstChild);
		}

		this.emitMirror(mirrorTag, 'clear', []);
	};

	passthroughAndClear(passthrough, mirrorTag) {
		this.clear();
		this.passthrough(passthrough, mirrorTag);
	}

	passthrough(stringValue, mirrorTag, emitMirror) {
		const thisElem = this;
		const passthroughMode = (typeof stringValue === 'string' && ['auto', 'all', 'none'].indexOf(stringValue.toLowerCase()) >= 0) ? stringValue.toLowerCase() : 'auto';

		switch(passthroughMode) {
			case 'auto':
				thisElem._elements.svg.style['pointer-events'] = 'none';
				thisElem.addCanvasTouchHandlers(thisElem);
				break;
			case 'none':
				thisElem._elements.svg.style['pointer-events'] = 'auto';
				thisElem.addCanvasTouchHandlers(thisElem);
				break;
			case 'all':
				thisElem._elements.svg.style['pointer-events'] = 'none';
				thisElem.removeCanvasTouchHandlers();
				break;
		}

		if(typeof emitMirror === 'undefined' || emitMirror)
			this.emitMirror(mirrorTag, 'passthrough', [passthroughMode]);
	}

	removeImage(imageId, mirrorTag) {
		if(typeof this._images[imageId] === 'object') {
			this._images[imageId].parentNode.removeChild(this._images[imageId]);
			delete this._images[imageId];
			this.emitMirror(mirrorTag, 'removeImage', arguments);
		}
	};

	addImage(percentageX, percentageY) {
		// Capture path attributes from element attributes
		let imageAttributes = {};
		let imageAttributeKeyPrefix = 'image-'; // capture all attributes that start with path-

		let attributes = this.getAttributes();

		for(let attributeKey in attributes) {
			if(attributes.hasOwnProperty(attributeKey) && attributeKey.indexOf(imageAttributeKeyPrefix) === 0)
				imageAttributes[attributeKey.slice(imageAttributeKeyPrefix.length)] = attributes[attributeKey];
		}

		let imageAttributesDefault = {
			'filter': 'url(#drop-shadow)'
		};

		imageAttributes = Object.assign(imageAttributesDefault, imageAttributes); // Merge defaults with passed params

		const imageId = this._uniqueId();
		this.addImageStyle(imageId, imageAttributes, percentageX, percentageY);
	};

	addImageStyle(imageId, imageAttributes, percentageX, percentageY, mirrorTag) {
		const thisElem = this;
		const coordinateX = percentageX * thisElem.clientWidth;
		const coordinateY = percentageY * thisElem.clientHeight;

		let drawingsNode = thisElem._elements.drawings;

		// Capture image-* attributes from element attributes
		let pathAttributes = {};
		let pathAttributeKeyPrefix = 'path-'; // capture all attributes that start with path-

		let attributes = thisElem.getAttributes();

		for(let attributeKey in attributes) { // pull keys before looping through?
			if (attributes.hasOwnProperty(attributeKey) && attributeKey.indexOf(pathAttributeKeyPrefix) === 0)
				pathAttributes[attributeKey.slice(pathAttributeKeyPrefix.length)] = attributes[attributeKey];
		}

		let imageNode = document.createElementNS('http://www.w3.org/2000/svg','image');

		// Set the image src
		imageNode.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageAttributes['href']);

		// Support percentages
		const imageWidth = (imageAttributes.width[imageAttributes.width.length - 1] === '%')
			? thisElem.clientWidth * (parseFloat(imageAttributes.width.replace(/[^\d.-]/g, '')) / 100)
			: parseFloat(imageAttributes.width.replace(/[^\d.-]/g, ''));

		// Support percentages
		const imageHeight = (imageAttributes.height[imageAttributes.height.length - 1] === '%')
			? thisElem.clientHeight * (parseFloat(imageAttributes.height.replace(/[^\d.-]/g, '')) / 100)
			: parseFloat(imageAttributes.height.replace(/[^\d.-]/g, ''));

		imageNode.setAttribute('x', String(coordinateX - (imageWidth / 2)));
		imageNode.setAttribute('y', String(coordinateY - (imageHeight / 2)));

		imageNode.setAttribute('width', String(imageWidth));
		imageNode.setAttribute('height', String(imageHeight));

		for(let attributeKey in imageAttributes) {
			if(imageAttributes.hasOwnProperty(attributeKey) && ['href', 'width', 'height', 'id'].indexOf(attributeKey) < 0)
				imageNode.setAttribute(attributeKey, imageAttributes[attributeKey]);
		}

		imageNode.addEventListener('mousedown',(event) => {
			event.stopPropagation();
			event.preventDefault();
			thisElem.removeImage(imageId);
		});

		imageNode.addEventListener('touchstart',(event) => {
			event.stopPropagation();
			event.preventDefault();
			thisElem.removeImage(imageId);
		});

		thisElem._images[imageId] = imageNode;
		drawingsNode.appendChild(imageNode);

		this.emitMirror(mirrorTag, 'addImageStyle', arguments);
	};

	// Collector function to start a path
	// Gather path attributes and pass to drawing function
	startPath(id, percentageX, percentageY) {
		// Capture path attributes from element attributes
		let pathAttributes = {};
		let pathAttributeKeyPrefix = 'path-'; // capture all attributes that start with path-
		let attributes = this.getAttributes();
		for(let attributeKey in attributes) {
			if(attributes.hasOwnProperty(attributeKey) && attributeKey.indexOf(pathAttributeKeyPrefix) === 0)
				pathAttributes[attributeKey.slice(pathAttributeKeyPrefix.length)] = attributes[attributeKey];
		}

		let pathAttributesDefault = {
			'fill': 'transparent',
			'stroke': 'red',
			'stroke-width': '10',
			'stroke-linecap': 'round',
			'filter': 'url(#drop-shadow)'
		};

		pathAttributes = Object.assign({}, pathAttributesDefault, pathAttributes); // Merge defaults with passed params

		this.startPathStyle(id, pathAttributes, percentageX, percentageY);
	};

	startPathStyle(id, pathAttributes, percentageX, percentageY, mirrorTag) {
		let coordinateX = percentageX * this.clientWidth;
		let coordinateY = percentageY * this.clientHeight;

		let drawingsNode = this._elements.drawings;

		let pathNode = document.createElementNS('http://www.w3.org/2000/svg','path');
		pathNode.setAttribute('d', 'M' + coordinateX.toString() + ',' + coordinateY.toString());

		for(let attributeKey in pathAttributes) {
			if(pathAttributes.hasOwnProperty(attributeKey)) {
				let attributeVal = pathAttributes[attributeKey];
				pathNode.setAttribute(attributeKey, attributeVal);
			}
		}

		drawingsNode.appendChild(pathNode);

		this._paths[id] = pathNode;

		this.emitMirror(mirrorTag, 'startPathStyle', arguments);
	};

	extendPath(id, percentageX, percentageY, mirrorTag) {
		// TODO fix this
		let coordinateX = percentageX * this.shadowRoot.querySelector('svg').clientWidth;
		let coordinateY = percentageY * this.shadowRoot.querySelector('svg').clientHeight;

		if(typeof this._paths[id] == 'object') {
			let pathNode = this._paths[id];
			pathNode.setAttribute('d', pathNode.getAttribute('d') + ' ' + coordinateX + ',' + coordinateY);
			this.emitMirror(mirrorTag, 'extendPath', arguments);
		}
	};

	endPath(id, percentageX, percentageY, mirrorTag) {
		if(typeof this._paths[id] == 'object')
			delete this._paths[id];
		this.emitMirror(mirrorTag, 'endPath', arguments);
	};

	emitMirror(mirrorTag, functionName, functionArgs = []) {
		const functionArgsArray = Array.isArray(functionArgs) ? functionArgs : Array.prototype.slice.call(functionArgs);
		let emitMirrorDetail = {function: functionName, arguments: functionArgsArray};
		if(typeof mirrorTag != 'undefined')
			emitMirrorDetail.tag = mirrorTag;

		let emitEvent = document.createEvent('CustomEvent');
		emitEvent.initCustomEvent('mirror', true, true, emitMirrorDetail);
		this.dispatchEvent(emitEvent);
	};

	removeCanvasTouchHandlers() {
		let thisElem = this;

		// Remove previous handler
		thisElem._eventHandlers.forEach(function(handler) {
			handler.types.forEach(function(type) {
				handler.target.removeEventListener(type, handler.listener)
			})
		});
		thisElem._eventHandlers = [];
	}

	addCanvasTouchHandlers(targetElem) {
		const thisElem = this;

		thisElem.removeCanvasTouchHandlers();

		thisElem._eventHandlers.push({
			target: targetElem,
			types: ['mousedown', 'mousemove'],
			listener: mouseHandler
		});

		thisElem._eventHandlers.push({
			target: window,
			types: ['mouseup'],
			listener: mouseHandler
		});

		thisElem._eventHandlers.push({
			target: targetElem,
			types: ['touchstart', 'touchmove', 'touchend'],
			listener: touchHandler
		});

		targetElem.addEventListener('mousedown', mouseHandler, false);
		targetElem.addEventListener('mousemove', mouseHandler, false);
		window.addEventListener('mouseup', mouseHandler, false);
		targetElem.addEventListener('touchstart', touchHandler, false);
		targetElem.addEventListener('touchmove', touchHandler, false);
		targetElem.addEventListener('touchend', touchHandler, false);

		function getMode() {
			let mode = thisElem.getAttribute('mode');
			return (mode === undefined) ? 'path' : mode;
		}

		function mouseHandler(event) {
			event.stopPropagation();
			event.preventDefault();
			const id = 'mouse';
			const mode = getMode();

			const canvasBoundingClientRect = targetElem.getBoundingClientRect();

			const eventPercentageX = (event.clientX - canvasBoundingClientRect.left) / canvasBoundingClientRect.width;
			const eventPercentageY = (event.clientY - canvasBoundingClientRect.top) / canvasBoundingClientRect.height;

			switch(mode) {
				case 'image':
					switch(event.type) {
						case 'mousedown':
							thisElem.addImage(eventPercentageX, eventPercentageY);
							break;
					}
					break;
				case 'path':
					switch(event.type) {
						case 'mousedown':
							thisElem.startPath(id, eventPercentageX, eventPercentageY);
							thisElem.mousedown = true;
							break;
						case 'mousemove':
							if(typeof thisElem.mousedown === 'boolean' && thisElem.mousedown)
								thisElem.extendPath(id, eventPercentageX, eventPercentageY);
							break;
						case 'mouseup':
							if(thisElem.mousedown) {
								thisElem.mousedown = false;
								thisElem.endPath(id, eventPercentageX, eventPercentageY);
							}
							break;
					}
					break;
			}
		}

		function touchHandler(event) {
			event.stopPropagation();
			event.preventDefault();
			const mode = getMode();
			const canvasBoundingClientRect = targetElem.getBoundingClientRect();

			for(let touchKey in event.changedTouches) {
				if(event.changedTouches.hasOwnProperty(touchKey)) {
					const touch = event.changedTouches[touchKey];
					const id = touch.identifier.toString();

					const eventPercentageX = (touch.clientX - canvasBoundingClientRect.left) / canvasBoundingClientRect.width;
					const eventPercentageY = (touch.clientY - canvasBoundingClientRect.top) / canvasBoundingClientRect.height;

					switch(mode) {
						case 'image':
							switch(event.type) {
								case 'touchstart':
									thisElem.addImage(eventPercentageX, eventPercentageY);
									break;
							}
							break;
						case 'path':
							switch (event.type) {
								case 'touchstart':
									thisElem.startPath(id, eventPercentageX, eventPercentageY);
									break;
								case 'touchmove':
									thisElem.extendPath(id, eventPercentageX, eventPercentageY);
									break;
								case 'touchend':
									thisElem.endPath(id, eventPercentageX, eventPercentageY);
									break;
							}
							break;
					}
				}
			}
		}
	}

	_uniqueId() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
	}

	getAttributes(target) {
		if(typeof target === 'undefined')
			target = this;
		let attributes = {};
		for(let ctr = 0; ctr < target.attributes.length; ctr++) {
			attributes[target.attributes[ctr].nodeName] = target.attributes[ctr].nodeValue;
		}
		return attributes;
	};
}

customElements.define('transparency-drawing', TransparencyDrawing);

export default TransparencyDrawing;
