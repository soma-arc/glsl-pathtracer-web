var renderer, canvas, cw, ch, mx, my, gl;
var startTime;
var time = 0.0;
var fps = 1000 / 30;
var uniLocation = new Array();
var readme;
var content

window.addEventListener('load', function(event){
    readme = $('#readme');
    content = $('#content');
    loadShader("path-frag", 256, 256);
}, false);

function showReadme(){
}

function reloadShader(element){
    readme.hide();
    content.show();
    var shader = element.id;
    document.getElementById("title").innerHTML = element.innerHTML;
    loadShader(shader + "-frag", parseInt(element.dataset.cw), parseInt(element.dataset.ch));
}

// function enlargeCanvas(){
//     renderer = document.getElementById('renderer');
//     cw += 10;
//     ch += 10;
//     c.width = cw;
//     c.height = ch;
//     gl.viewport(0, 0, cw, ch);
// }

// function reduceCanvas(){
//     renderer = document.getElementById('renderer');
//     cw -= 10;
//     ch -= 10;
//     c.width = cw;
//     c.height = ch;
//     gl.clear(gl.COLOR_BUFFER_BIT);
//     gl.viewport(0, 0, cw, ch);
// }

var sum;
var sampleNum = 1;
var canvasContext;
var textures = [];
var framebuffer;
var vPosition, vIndex, vAttLocation;
var program;
function loadShader(fragShaderName, width, height){
    time = 0.0;
    renderer = document.getElementById('renderer');
    canvas = document.getElementById('canvas');
    cw = width; ch = height;
    renderer.width = cw; renderer.height = ch;
    canvas.width = cw; canvas.height = ch;
//    c.addEventListener('mousemove', mouseMove, true);

    gl = renderer.getContext('webgl') || renderer.getContext('experimental-webgl');
    canvasContext = canvas.getContext('2d');

    sum = new Uint8Array(cw * ch * 4);//canvasContext.createImageData(cw, ch).data;
    sampleNum = 1;

    program = gl.createProgram();

    var dfd = attachShader(fragShaderName, program, gl.FRAGMENT_SHADER);
    var dfd2 = attachShader('vertex', program, gl.VERTEX_SHADER);
    $.when(dfd, dfd2).done(function(){
        var prg = linkProgram(program);
        program = prg;
	uniLocation[0] = gl.getUniformLocation(prg, 'time');
	uniLocation[1] = gl.getUniformLocation(prg, 'mouse');
	uniLocation[2] = gl.getUniformLocation(prg, 'resolution');
        uniLocation[3] = gl.getUniformLocation(prg, 'textureWeight');
        uniLocation[4] = gl.getUniformLocation(prg, 'sampleNum');

	var position = [
                -1.0,  1.0,  0.0,
            1.0,  1.0,  0.0,
		-1.0, -1.0,  0.0,
	    1.0, -1.0,  0.0
	];
	var index = [
	    0, 2, 1,
	    1, 2, 3
	];

        // create textures
        var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;
        textures = [];
        for(var i = 0; i < 2; i++) {
            textures.push(gl.createTexture());
            gl.bindTexture(gl.TEXTURE_2D, textures[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, cw, ch, 0, gl.RGB, type, null);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        framebuffer = gl.createFramebuffer();

	vPosition = createVbo(position);
	vIndex = createIbo(index);
	vAttLocation = gl.getAttribLocation(prg, 'position');
	gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
	gl.enableVertexAttribArray(vAttLocation);
	gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	mx = 0.5; my = 0.5;
	startTime = new Date().getTime();
        gl.viewport(0, 0, cw, ch);
	render();
    });
}

function mouseMove(e){
    mx = e.offsetX / cw;
    my = e.offsetY / ch;
}

var DISPLAY_GAMMA = 2.2;
function render(){
    time = (new Date().getTime() - startTime) * 0.001;
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(uniLocation[0], time);
    gl.uniform2fv(uniLocation[1], [mx, my]);
    gl.uniform2fv(uniLocation[2], [cw, ch]);
    gl.uniform1f(uniLocation[3], 1 / (sampleNum));
    gl.uniform1i(uniLocation[4], sampleNum);

    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[1], 0);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

//    gl.flush();

    sampleNum++;
    textures.reverse();
//    setTimeout(render, fps);
}

function attachShader(shaderId, program, shaderType){
    var shader = gl.createShader(shaderType);
    elem = document.getElementById(shaderId).text;
    gl.shaderSource(shader, elem);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        gl.attachShader(program, shader);
    }else{
	alert(gl.getShaderInfoLog(shader));
	console.log(gl.getShaderInfoLog(shader));
    }
}

function linkProgram(program){
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
	gl.useProgram(program);
	return program;
    }else{
	return null;
    }
}

function createVbo(data){
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
}

function createIbo(data){
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
}
