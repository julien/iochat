// shim layer with setTimeout fallback
window.requestAnimationFrame = (function() {
  return  window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

window.cancelRequestAnimationFrame = (function() {
  return  window.cancelRequestAnimationFrame || 
    window.wekbitCancelRequestAnimationFrame || 
    window.mozCancelRequestAnimationFrame    || 
    window.oCancelRequestAnimationFrame      || 
    window.msCancelRequestAnimationFrame     || 
    function (callback) {
      window.clearTimeout(callback);
    };
})();

// usage: 
// instead of setInterval(render, 16) ....
// (function animloop(){
//  requestAnimFrame(animloop);
//  render();
// })();
