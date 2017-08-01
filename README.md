# My Component #
A web component that allows for finger painting on a transparent canvas

## Installation ##

### Bower ###
	
	bower install

### Node ###

	npm install

## Usage ##

	<!DOCTYPE html>
    	<html>
    	<head>
    		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    	
    		<!-- Polyfill -->
    		<script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.0.4/webcomponents-lite.js"></script>
    
    		<link rel="import" href="transparency-drawing.html">
    	
    	</head>
    	<body>
    		<div style="width: 500px; height: 500px; display: block; background-color: #00ff00">
    			<transparency-drawing></transparency-drawing>
    		</div>
    		<script>
    			var mirrorIframe = document.querySelector('transparency-drawing');
    			mirrorIframe.addEventListener('mirror', function(event) {
    				console.log(event);
    			});
    		</script>
    	</body>
    	</html>