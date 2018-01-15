

			var compressor=null;
			//补充requestAnimationFrame方法
			if ( !window.requestAnimationFrame ) {

				window.requestAnimationFrame = ( function() {

					return window.webkitRequestAnimationFrame ||
						window.mozRequestAnimationFrame ||
						window.oRequestAnimationFrame ||
						window.msRequestAnimationFrame ||
						function ( callback, element ) {

							window.setTimeout( callback, 1000 / 60 );

						};

				} )();

			}
			//补充时间方法
			// Get older browsers safely through init code, so users can read the
			// message about how to download newer browsers.
			if (!Date.now) {
				Date.now = function() {
					return +new Date();
				};
			}

			// Greetings to Iq/RGBA! ;)

			var toolbar, compileButton, fullscreenButton, compileTimer, errorLines = [];
			var code, canvas, gl, buffer, currentProgram, vertexPosition, screenVertexPosition, panButton,
			parameters = { startTime: Date.now(), time: 0, mouseX: 0.5, mouseY: 0.5, screenWidth: 0, screenHeight: 0 },
			surface = { centerX: 0, centerY: 0, width: 1, height: 1, isPanning: false, isZooming: false, lastX: 0, lastY: 0 },
			frontTarget, backTarget, screenProgram, getWebGL, resizer = {}, compileOnChangeCode = true;

			init();
			if (gl) { animate(); }

			function init() {

				if (!document.addEventListener) {
					document.location = 'http://get.webgl.org/';
					return;
				}

				canvas = document.getElementById( 'canvas' );
				canvas.style.display = 'block';

				try {

					gl = canvas.getContext( 'experimental-webgl', { preserveDrawingBuffer: true } );

				} catch( error ) { }

				if ( !gl ) {

					alert("WebGL not supported, but code will be shown.");

				} else {
					
					// enable dFdx, dFdy, fwidth
					gl.getExtension('OES_standard_derivatives');

					// Create vertex buffer (2 triangles)

					buffer = gl.createBuffer();
					gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
					gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ - 1.0, - 1.0, 1.0, - 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0 ] ), gl.STATIC_DRAW );


				}

				
				
			
				

				

			
			
			

				var program = gl.createProgram();
				var fragment = document.getElementById( 'example' ).textContent;
				var vertex = document.getElementById( 'surfaceVertexShader' ).textContent;

				var vs = createShader( vertex, gl.VERTEX_SHADER );
				var fs = createShader( fragment, gl.FRAGMENT_SHADER );

				if ( vs == null || fs == null ) return null;

				gl.attachShader( program, vs );
				gl.attachShader( program, fs );

				gl.deleteShader( vs );
				gl.deleteShader( fs );

				gl.linkProgram( program );

				if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

					var error = gl.getProgramInfoLog( program );

					console.error( error );

					console.error( 'VALIDATE_STATUS: ' + gl.getProgramParameter( program, gl.VALIDATE_STATUS ), 'ERROR: ' + gl.getError() );

					return;

				}

				if ( currentProgram ) {

					gl.deleteProgram( currentProgram );

				}

				currentProgram = program;


				panButton.style.display = (fragment.indexOf('varying vec2 surfacePosition;') >= 0) ? 'inline' : 'none';

				// Cache uniforms

				cacheUniformLocation( program, 'time' );
				cacheUniformLocation( program, 'mouse' );
				cacheUniformLocation( program, 'resolution' );
				cacheUniformLocation( program, 'backbuffer' );
				cacheUniformLocation( program, 'surfaceSize' );

				// Load program into GPU

				gl.useProgram( currentProgram );

				// Set up buffers

				surface.positionAttribute = gl.getAttribLocation(currentProgram, "surfacePosAttrib");
				gl.enableVertexAttribArray(surface.positionAttribute);

				vertexPosition = gl.getAttribLocation(currentProgram, "position");
				gl.enableVertexAttribArray( vertexPosition );

			}

			function cacheUniformLocation( program, label ) {

				if ( program.uniformsCache === undefined ) {

					program.uniformsCache = {};

				}

				program.uniformsCache[ label ] = gl.getUniformLocation( program, label );

			}

	

			function onWindowResize( event ) {

				var isMaxWidth = ((resizer.currentWidth === resizer.maxWidth) || (resizer.currentWidth === resizer.minWidth)),
					isMaxHeight = ((resizer.currentHeight === resizer.maxHeight) || (resizer.currentHeight === resizer.minHeight));

				toolbar.style.width = window.innerWidth - 47 + 'px';

				resizer.isResizing = false;
				resizer.maxWidth = window.innerWidth - 75;
				resizer.maxHeight = window.innerHeight - 125;
				if (isMaxWidth || (resizer.currentWidth > resizer.maxWidth)) {
					resizer.currentWidth = resizer.maxWidth;
				}
				if (isMaxHeight || (resizer.currentHeight > resizer.maxHeight)) {
					resizer.currentHeight = resizer.maxHeight;
				}
				if (resizer.currentWidth < resizer.minWidth) { resizer.currentWidth = resizer.minWidth; }
				if (resizer.currentHeight < resizer.minHeight) { resizer.currentHeight = resizer.minHeight; }

				

				canvas.width = window.innerWidth / quality;
				canvas.height = window.innerHeight / quality;

				canvas.style.width = window.innerWidth + 'px';
				canvas.style.height = window.innerHeight + 'px';

				parameters.screenWidth = canvas.width;
				parameters.screenHeight = canvas.height;

				computeSurfaceCorners();

				if (gl) {
				
					gl.viewport( 0, 0, canvas.width, canvas.height );

					createRenderTargets();
					
				}
			}

			//

			function animate() {

				requestAnimationFrame( animate );
				render();

			}

			function render() {

				if ( !currentProgram ) return;

				parameters.time = Date.now() - parameters.startTime;

				// Set uniforms for custom shader

				gl.useProgram( currentProgram );

				gl.uniform1f( currentProgram.uniformsCache[ 'time' ], parameters.time / 1000 );
				gl.uniform2f( currentProgram.uniformsCache[ 'mouse' ], parameters.mouseX, parameters.mouseY );
				gl.uniform2f( currentProgram.uniformsCache[ 'resolution' ], parameters.screenWidth, parameters.screenHeight );
				gl.uniform1i( currentProgram.uniformsCache[ 'backbuffer' ], 0 );
				gl.uniform2f( currentProgram.uniformsCache[ 'surfaceSize' ], surface.width, surface.height );

				gl.bindBuffer( gl.ARRAY_BUFFER, surface.buffer );
				gl.vertexAttribPointer( surface.positionAttribute, 2, gl.FLOAT, false, 0, 0 );
				
				gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
				gl.vertexAttribPointer( vertexPosition, 2, gl.FLOAT, false, 0, 0 );

				gl.activeTexture( gl.TEXTURE0 );
				gl.bindTexture( gl.TEXTURE_2D, backTarget.texture );

				// Render custom shader to front buffer

				gl.bindFramebuffer( gl.FRAMEBUFFER, frontTarget.framebuffer );

				gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
				gl.drawArrays( gl.TRIANGLES, 0, 6 );

				// Set uniforms for screen shader

				gl.useProgram( screenProgram );

				gl.uniform2f( screenProgram.uniformsCache[ 'resolution' ], parameters.screenWidth, parameters.screenHeight );
				gl.uniform1i( screenProgram.uniformsCache[ 'texture' ], 1 );

				gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
				gl.vertexAttribPointer( screenVertexPosition, 2, gl.FLOAT, false, 0, 0 );
				
				gl.activeTexture( gl.TEXTURE1 );
				gl.bindTexture( gl.TEXTURE_2D, frontTarget.texture );

				// Render front buffer to screen

				gl.bindFramebuffer( gl.FRAMEBUFFER, null );

				gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
				gl.drawArrays( gl.TRIANGLES, 0, 6 );

				// Swap buffers

				var tmp = frontTarget;
				frontTarget = backTarget;
				backTarget = tmp;

			}