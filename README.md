# My Component #
A web component that allows for finger painting or image stamping on a transparent canvas

## Installation ##

### Node ###

	npm install

## Options ##

| Attribute Name 	| Description                                                                                                        	|
|----------------	|--------------------------------------------------------------------------------------------------------------------	|
| passthrough    	| all: passes through all clicks/touches none: captures all clicks/touches auto: clicks/touches bubble up to drawing (doesn't work with image mode)  	|
| mode           	| image: add an image path: draw a line                                                                              	|
| path-*         	| Apply attributes to path                                                                                           	|
| image-*        	| Apply attributes to image stamp                                                                                    	|

## Usage ##

    <script type="module" src="TransparencyDrawing.js"></script>

### Path mode ###

	<transparency-drawing passthrough="auto" mode="path" path-stroke="#00ff00" path-stroke-width="10" path-stroke-opacity="0.5" id="drawing1" style="position: absolute; top: 0; left: 0; width: 75%; height: 50%; border: 2px solid #000000; display: block;">
		<div style="width: 100%; height: 100%; border: 2px solid #0000ff;">
			<a href="http://cnn.com">CNN</a>
		</div>
	</transparency-drawing>

### Image mode ###

	<transparency-drawing passthrough="auto" mode="image" image-href="image.png" image-height="10%" image-width="10%" style="position: absolute; top: 0; left: 0; width: 75%; height: 50%; border: 2px solid #000000; display: block;">
		<div style="width: 100%; height: 100%; border: 2px solid #0000ff;">
			<a href="http://cnn.com">CNN</a>
		</div>
	</transparency-drawing>
