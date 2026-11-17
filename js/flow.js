/* Ketvoice — the flowing sunset band (WebGL, no dependencies).
 * A slow domain-warped gradient in the Vice City colours rises from the bottom of
 * the hero and of the footer, with a soft glowing edge that undulates.
 * Cheap on purpose: drawn at half resolution, ~30 fps, only while on screen and
 * while the tab is visible; one still frame with prefers-reduced-motion; a CSS
 * gradient when WebGL is unavailable. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvases = [].slice.call(document.querySelectorAll('canvas[data-flow]'));
  if (!canvases.length) return;

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 R;uniform float T;uniform float E;uniform float L;uniform float S;uniform float D;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=vec2(uv.x*ar,uv.y)*1.35;',
    ' float t=T*S;',
    ' vec2 q=vec2(fb(p+vec2(0.,t*.06)),fb(p+vec2(5.2,1.3)-vec2(t*.05,0.)));',
    ' float f=fb(p+2.2*q+vec2(t*.03,-t*.02));',
    // the band edge: higher at the sides, slow waves, a little turbulence
    ' float side=pow(abs(uv.x-.5)*2.,2.);',
    ' float e=E+.16*side+.045*sin(uv.x*5.2+t*.42)+.03*sin(uv.x*11.-t*.6)+.08*(q.x-.5);',
    ' float d=clamp((e-uv.y)/max(e,.001),0.,1.);',
    ' float m=smoothstep(-.06,.10,e-uv.y);',
    ' float k=clamp(d*1.15*D+(f-.5)*.55,0.,1.);',
    ' vec3 edge=mix(vec3(1.,.66,.78),vec3(1.,.97,.95),L);',
    ' vec3 c1=vec3(1.,.70,.48);vec3 c2=vec3(1.,.33,.58);vec3 c3=vec3(.48,.20,.86);vec3 c4=vec3(.09,.04,.22);',
    ' vec3 col=mix(edge,c1,smoothstep(0.,.18,k));col=mix(col,c2,smoothstep(.14,.42,k));',
    ' col=mix(col,c3,smoothstep(.40,.72,k));col=mix(col,c4,smoothstep(.70,1.,k));',
    ' col+=.05*(f-.5);',
    ' gl_FragColor=vec4(col*m,m);',
    '}'
  ].join('\n');

  function make(cv) {
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return null;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = { R: gl.getUniformLocation(pr, 'R'), T: gl.getUniformLocation(pr, 'T'), E: gl.getUniformLocation(pr, 'E'), L: gl.getUniformLocation(pr, 'L'), S: gl.getUniformLocation(pr, 'S'), D: gl.getUniformLocation(pr, 'D') };
    var foot = cv.dataset.flow === 'foot';
    var st = { cv: cv, gl: gl, u: u, on: false, seed: foot ? 37 : 0 };
    st.size = function () {
      var r = cv.getBoundingClientRect(), k = Math.min(1, 900 / Math.max(1, r.width)) * 0.5;
      var w = Math.max(2, Math.round(r.width * Math.max(k, 0.35))), hh = Math.max(2, Math.round(r.height * Math.max(k, 0.35)));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; gl.viewport(0, 0, w, hh); }
    };
    st.draw = function (t) {
      gl.uniform2f(u.R, cv.width, cv.height);
      gl.uniform1f(u.T, t + st.seed);
      gl.uniform1f(u.E, foot ? 0.5 : (innerWidth < 760 ? 0.46 : 0.52));
      gl.uniform1f(u.L, document.documentElement.classList.contains('dark') ? 0 : 1);
      gl.uniform1f(u.S, 1);
      gl.uniform1f(u.D, foot ? 0.62 : 1);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    return st;
  }

  var flows = [];
  canvases.forEach(function (cv) {
    var st = null;
    try { st = make(cv); } catch (e) { st = null; }
    if (!st) { cv.classList.add('flow-css'); return; }
    st.size(); st.draw(4);
    flows.push(st);
  });
  if (!flows.length) return;
  addEventListener('resize', function () { flows.forEach(function (s) { s.size(); s.draw(s.last || 4); }); });
  // a theme switch changes the edge colour: redraw at once
  new MutationObserver(function () { flows.forEach(function (s) { s.draw(s.last || 4); }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  if (reduce) return;

  var t0 = performance.now(), lastFrame = 0, running = false;
  function loop(now) {
    var any = false;
    if (now - lastFrame > 32) {
      lastFrame = now;
      var t = 4 + (now - t0) / 1000;
      flows.forEach(function (s) { if (s.on) { s.last = t; s.draw(t); any = true; } });
    } else any = flows.some(function (s) { return s.on; });
    if (any && !document.hidden) requestAnimationFrame(loop); else running = false;
  }
  function wake() { if (!running && !document.hidden && flows.some(function (s) { return s.on; })) { running = true; requestAnimationFrame(loop); } }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { flows.forEach(function (s) { if (s.cv === e.target) s.on = e.isIntersecting; }); });
      wake();
    });
    flows.forEach(function (s) { io.observe(s.cv); });
  } else { flows.forEach(function (s) { s.on = true; }); wake(); }
  document.addEventListener('visibilitychange', wake);
})();
