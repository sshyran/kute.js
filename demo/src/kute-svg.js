/* KUTE.js - The Light Tweening Engine
 * package - SVG Plugin
 * desc - draw strokes, morph paths and SVG color props
 * by dnp_theme
 * Licensed under MIT-License
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(["./kute.js"], function(KUTE){ factory(KUTE); return KUTE; });
  } else if(typeof module == "object" && typeof require == "function") {
    // We assume, that require() is sync.
    var KUTE = require("./kute.js");   
    // Export the modified one. Not really required, but convenient.
    module.exports = factory(KUTE);
  } else if ( typeof window.KUTE !== 'undefined' ) {
    // Browser globals		
    window.KUTE.svg = window.KUTE.svg || factory(KUTE);
  } else {
    throw new Error("SVG Plugin require KUTE.js.");
  }
}( function (KUTE) {
  'use strict';
  var K = window.KUTE, S = S || {}, p, DOM = K.dom, PP = K.pp,
    _svg = document.querySelector('path') || document.querySelector('svg'),
    _ns = _svg && _svg.ownerSVGElement && _svg.ownerSVGElement.namespaceURI || 'http://www.w3.org/2000/svg',
    _nm = ['strokeWidth', 'strokeOpacity', 'fillOpacity', 'stopOpacity'], // numeric SVG CSS props
    _cls = ['fill', 'stroke', 'stopColor'], // colors 'hex', 'rgb', 'rgba' -- #fff / rgb(0,0,0) / rgba(0,0,0,0)
    pathReg = /(m[^(h|v|l)]*|[vhl][^(v|h|l|z)]*)/gmi,
    // interpolate functions
    number = K.Interpolate.number, color = K.Interpolate.color,
    array = function array(a,b,l,v) { // array1, array2, array2.length, progress
      var na = [], i;
      for(i=0;i<l;i++) { na.push( a[i] === b[i] ? b[i] : number(a[i],b[i],v) ); } // don't do math if not needed
      return na;
    },
    coords = function coords(a,b,l,ll,o,v) { // array1, array2, array2.length, coordinates.length, joiner, progress for SVG stuff
      var s = [], i;
      for(i=0;i<l;i++) { s.push( array( a[i],b[i],ll,v ) ); }
      return s.join(o);
    };
  
  if (_svg && !_svg.ownerSVGElement) {return;} // if SVG API is not supported, return
    
  // SVG MORPH
  S.gPt = function(e){ // get path d attribute or create a path from string value
    var p = {}, el = typeof e === 'object' ? e : /^\.|^\#/.test(e) ? document.querySelector(e) : null;
    if ( el && /path|glyph/.test(el.tagName) ) {
      p.e = S.fPt(el);
      p.o = el.getAttribute('d');

    } else if (!el && /[a-z][^a-z]*/ig.test(e)) { // maybe it's a string path already
      p.e = S.cP(e.trim());
      p.o = e;
    }
    return p;
  }
  
  S.pCr = function(w){ // pathCross
    // path tween options
    this._mpr = w._ops.morphPrecision || 25;  
    this._midx = w._ops.morphIndex; 
    this._smi = w._ops.showMorphInfo;
    this._rv1 = w._ops.reverseFirstPath;
    this._rv2 = w._ops.reverseSecondPath;
    
    var p1 = S.gOp(w._vS.path.o), p2 = S.gOp(w._vE.path.o), arr;
    this._isp = !/[CSQTA]/i.test(p1) && !/[CSQTA]/i.test(p2); // both shapes are polygons
    
    arr = S._pCr(p1,p2,w._el.parentNode);

    w._vS.path.d = arr[0];
    w._vE.path.d = arr[1];
  }

  S._pCr = function(s,e,svg){ // _pathCross
    var s1, e1, arr, idx, arL, sm, lg, smp, lgp, nsm = [], sml, cl = [], len, tl, cs;
    this._sp = false;
    
    if (!this._isp) {
        s = S.cP(s); e = S.cP(e);  
        arr = S.gSegs(s,e,this._mpr); 
        s1 = arr[0]; e1 = arr[1]; arL = e1.length;
    } else {
      s = S.pTA(s); e = S.pTA(e);

      if ( s.length !== e.length ){
        arL = Math.max(s.length,e.length);
        if ( arL === e.length) { sm = s; lg = e; } else { sm = e; lg = s; }
        sml = sm.length;

        smp = S.cP('M'+sm.join('L')+'z'); len = smp.getTotalLength() / arL;
        for (var i=0; i<arL; i++){
          tl = smp.getPointAtLength(len*i);
          cs = S.gCP(len,tl,sm);
          nsm.push( [ cs[0], cs[1] ] );
        }

        if (arL === e.length) { e1 = lg; s1 = nsm; } else { s1 = lg; e1 = nsm; }
      } else {
        s1 = s; e1 = e;
      }
    }

    // reverse arrays
    if (this._rv1) { s1.reverse(); }
    if (this._rv2) { e1.reverse(); }

    // determine index for best/minimum distance between points
    if (this._smi) { idx = S.gBi(s1,e1); }
    
    // shift second array to for smallest tween distance
    if (this._midx) {
      var e11 = e1.splice(this._midx,arL-this._midx);
      e1 = e11.concat(e1);
    }

    // the console.log helper utility
    if (this._smi) {
      // also show the points
      S.shP(s1,e1,svg);
      var mpi = this._isp ? 'the polygon with the most points.\n' : (this._mpr === 25 ? 'the default' : 'your') +' morphPrecision value of '+this._mpr+'.\n';
      console.log( 'KUTE.js Path Morph Log\nThe morph used ' + arL + ' points to draw both paths based on '+mpi 
        + (this._midx ? 'You\'ve configured the morphIndex to ' + this._midx + ' while the recommended is ' + idx+ '.\n' : 'You may also consider a morphIndex for the second path. Currently the best index seems to be ' + idx + '.\n')
        + (
            !this._rv1 && !this._rv2 ? 'If the current animation is not satisfactory, consider reversing one of the paths. Maybe the paths do not intersect or they really have different draw directions.' :
            'You\'ve chosen that the first path to have ' + ( this._rv1  ? 'REVERSED draw direction, ' : 'UNCHANGED draw direction, ') + 'while second path is to be ' + (this._rv2 ? 'REVERSED.\n' : 'UNCHANGED.\n')
          )
      );
    }
    
    s = e = null;
    return [s1,e1]
  }

  S.gSegs = function(s,e,r){ // getSegments returns an array of points based on a sample size morphPrecision
    var s1 = [], e1 = [], le1 = s.getTotalLength(), le2 = e.getTotalLength(), ml = Math.max(le1,le2),
      d = r, ar = ml / r, j = 0, sl = ar*r; // sl = sample length

    while ( (j += r) < sl ) { // populate the points arrays based on morphPrecision as sample size
      s1.push( [s.getPointAtLength(j).x, s.getPointAtLength(j).y]);
      e1.push( [e.getPointAtLength(j).x, e.getPointAtLength(j).y]);
    }
    return [s1,e1];
  }
  
  S.gCP = function(p,t,s){ // getClosestPoint for polygon paths it returns a close point from the original path (length,pointAtLength,smallest); // intervalLength
    var x, y, a = [], l = s.length, dx, nx, pr;
    for (i=0; i<l; i++){
      x = Math.abs(s[i][0] - t.x);
      y = Math.abs(s[i][1] - t.y);
      a.push( Math.sqrt( x * x + y * y ) );
    }
    dx = a.indexOf(Math.min.apply(null,a));
    pr = !!s[dx-1] ? dx-1 : l-1;
    nx = !!s[dx+1] ? dx+1 : 0;
    return Math.abs(s[pr][0] - t.x) < p && Math.abs(s[pr][1] - t.y) < p ? s[pr]
    : Math.abs(s[nx][0] - t.x) < p && Math.abs(s[nx][1] - t.y) < p ? s[nx] 
    : Math.abs(s[dx][0] - t.x) < p && Math.abs(s[dx][1] - t.y) < p ? s[dx] 
    : [t.x,t.y];
  }
  
  S.shP = function(s,e,v){// showPoints helper function to visualize the points on the path
    if (!this._sp){
        var c, a = arguments, cl, p, l;
        for (var i=0; i<2; i++){
          p = a[i]; l = p.length; cl = i=== 0 ? { f: 'DeepPink', o: 'HotPink' } : { f: 'Lime', o: 'LimeGreen' };
          for (var j=0; j<l; j++) {
            c = document.createElementNS(_ns,'circle');
            c.setAttribute('cx',p[j][0]); c.setAttribute('cy',p[j][1]);
            c.setAttribute('r', j===0 ? 20 : 10 ); c.setAttribute('fill', j===0 ? cl.f : cl.o);
            if (this._isp) { v.appendChild(c); } else if (!this._isp && j===0 ) { v.appendChild(c);}
          }
        }
        this._sp = true; c = null;
    }      
  }
  
  S.gBi = function(s,e){ // getBestIndex for shape rotation
    var s1 = S.clone(s), e1 = S.clone(e), d = [], i, l = e.length, t, ax, ay;
    for (i=0; i<l; i++){
      t = e1.splice(i,l-i); e1 = t.concat(e1);
      ax = Math.abs(s1[i][0] - e1[i][0]);
      ay = Math.abs(s1[i][1] - e1[i][1]);
      d.push( Math.sqrt( ax * ax + ay * ay ) );
      e1 = []; e1 = S.clone(e); t = null;
    }
    return d.indexOf(Math.min.apply(null,d));
  }
  
  S.gOp = function(p){ // getOnePath, first path only
    return p.split(/z/i).shift() + 'z';
  }

  S.cP = function (p){ // createPath
    var c = document.createElementNS(_ns,'path'), d = typeof p === 'object' ? p.getAttribute('d') : p; 
    c.setAttribute('d',d); return c;
  }
  
  S.fPt = function(p){ // forcePath for glyph elements
    if (p.tagName === 'glyph') { // perhaps we can also change other SVG tags in the future 
      var c = S.cP(p); p.parentNode.appendChild(c); return c;
    } 
    return p;
  }
  
  S.clone = function(a) {
    var copy;
    if (a instanceof Array) {
      copy = [];
      for (var i = 0, len = a.length; i < len; i++) {
        copy[i] = S.clone(a[i]);
      }
      return copy;
    }
    return a;
  }
  
  S.pTA = function(p) { // simple pathToAbsolute for polygons | this is still BETA / a work in progress
    var np = p.match(pathReg), wp = [], l = np.length, s, c, r, x = 0, y = 0;
    for (var i = 0; i<l; i++){
      np[i] = np[i]; c = np[i][0]; r = new RegExp(c+'[^\\d|\\-]*','i'); 
      np[i] = np[i].replace(/(^|[^,])\s*-/g, '$1,-').replace(/(\s+\,|\s|\,)/g,',').replace(r,'').split(',');
      np[i][0] = parseFloat(np[i][0]);
      np[i][1] = parseFloat(np[i][1]);
      if (i === 0) { x+=np[i][0]; y +=np[i][1]; }
      else {
        x = np[i-1][0]; 
        y = np[i-1][1]; 
        if (/l/i.test(c)) {
          np[i][0] = c === 'l' ? np[i][0] + x : np[i][0];
          np[i][1] = c === 'l' ? np[i][1] + y : np[i][1];  
        } else if (/h/i.test(c)) {
          np[i][0] = c === 'h' ? np[i][0] + x : np[i][0];
          np[i][1] = y;  
        } else if (/v/i.test(c)) {
          np[i][0] = x;
          np[i][1] = c === 'v' ? np[i][0] + y : np[i][0];
        }
      }
    }
    return np;
  }

  // a shortHand pathCross && SVG transform stack
  K.svq = function(w){ if ( w._vE.path ) S.pCr(w); if ( w._vE.svgTransform ) S.sT(w); }
  
  // register the render SVG path object  
  // process path object and also register the render function
  K.pp['path'] = function(a,o,l) { // K.pp['path']('path',value,element);
    if (!('path' in DOM)) {
      DOM['path'] = function(l,p,a,b,v){
        l.setAttribute("d", v === 1 ? b.o : 'M' + coords( a['d'],b['d'],b['d'].length,2,'L',v ) + 'Z' );       
      }
    }
    return S.gPt(o);
  };
    
  K.prS['path'] = function(el,p,v){
    return el.getAttribute('d');
  };

  // SVG DRAW
  S.gDr = function(e,v){
    var l = /path|glyph/.test(e.tagName) ? e.getTotalLength() : S.gL(e), start, end, d, o;
    if ( v instanceof Object ) {
      return v;
    } else if (typeof v === 'string') { 
      v = v.split(/\,|\s/);
      start = /%/.test(v[0]) ? S.pc(v[0].trim(),l) : parseFloat(v[0]);
      end = /%/.test(v[1]) ? S.pc(v[1].trim(),l) : parseFloat(v[1]);
    } else if (typeof v === 'undefined') {
      o = parseFloat(K.gCS(e,'stroke-dashoffset'));
      d = K.gCS(e,'stroke-dasharray').split(/\,/);
      
      start = 0-o;
      end = parseFloat(d[0]) + start || l;
    }
    
    return { s: start, e: end, l: l } 
  };
  
  S.pc = function(v,l){ // percent
    return parseFloat(v) / 100 * l;
  };
  
  PP['draw'] = function(a,o,f){ // register the draw property
    if (!('draw' in DOM)) {
      DOM['draw'] = function(l,p,a,b,v){
        var ll = a.l, s = number(a.s,b.s,v), e = number(a.e,b.e,v), o = 0 - s;
        l.style.strokeDashoffset = o +'px';
        l.style.strokeDasharray = e+o<1 ? '0px, ' + ll + 'px' : (e+o) + 'px, ' + ll + 'px';
      }
    }
    return S.gDr(f,o);
  }
  
  K.prS['draw'] = function(el,p,v){
    return S.gDr(el);
  }

  // SVG DRAW UTILITITES
  // http://stackoverflow.com/a/30376660
  S.gL = function(el){ // getLength - returns the result of any of the below functions
    if (/rect/.test(el.tagName)) {
      return S.gRL(el);
    } else if (/circle/.test(el.tagName)) {
      return S.gCL(el);
    } else if (/ellipse/.test(el.tagName)) {
      return S.gEL(el);
    } else if (/polygon|polyline/.test(el.tagName)) {
      return S.gPL(el);
    } else if (/line/.test(el.tagName)) {
      return S.gLL(el);
    }
  }

  S.gRL = function(el){ // getRectLength - return the length of a Rect
    var w = el.getAttribute('width');
    var h = el.getAttribute('height');
    return (w*2)+(h*2);
  }

  S.gPL = function(el){ // getPolygonLength / getPolylineLength - return the length of the Polygon / Polyline
    var points = el.getAttribute('points').split(' '), len = 0;
    if (points.length > 1) {
      var coord = function (p) {
        var c = p.split(',');
        if (c.length != 2) {
          return; // return undefined
        }
        if (isNaN(c[0]) || isNaN(c[1])) {
          return;
        }
        return [parseFloat(c[0]), parseFloat(c[1])];
      };

      var dist = function (c1, c2) {
        if (c1 != undefined && c2 != undefined) {
          return Math.sqrt(Math.pow((c2[0]-c1[0]), 2) + Math.pow((c2[1]-c1[1]), 2));
        }
        return 0;
      };

      if (points.length > 2) {
        for (var i=0; i<points.length-1; i++) {
          len += dist(coord(points[i]), coord(points[i+1]));
        }
      }
      len += dist(coord(points[0]), coord(points[points.length-1]));
    }
    return len;
  }

  S.gLL = function(el){ // getLineLength - return the length of the line
    var x1 = el.getAttribute('x1');
    var x2 = el.getAttribute('x2');
    var y1 = el.getAttribute('y1');
    var y2 = el.getAttribute('y2');
    return Math.sqrt(Math.pow((x2-x1), 2)+Math.pow((y2-y1),2));
  }

  S.gCL = function(el){ // getCircleLength - return the length of the circle
    var r = el.getAttribute('r');
    return 2 * Math.PI * r; 
  }

  S.gEL = function(el) { // getEllipseLength - returns the length of an ellipse
    var rx = el.getAttribute('rx'), ry = el.getAttribute('ry'),
        len = 2*rx, wid = 2*ry;
    return ((Math.sqrt(.5 * ((len * len) + (wid * wid)))) * (Math.PI * 2)) / 2;
  }
  
  // SVG CSS Color Properties
  for ( var i = 0, l = _cls.length; i< l; i++) { 
    p = _cls[i];
    PP[p] = function(p,v){
      if (!(p in DOM)) {
        DOM[p] = function(l,p,a,b,v,o) {
          l.style[p] = color(a,b,v,o.keepHex);
        };
      }
      return K.truC(v);
    } 
    K.prS[p] = function(el,p,v){
       return K.gCS(el,p) || 'rgba(0,0,0,0)';
    }
  }

  
  for ( var i = 0, l = _nm.length; i< l; i++) { // for numeric CSS props from any type of SVG shape
    p = _nm[i];
    if (p === 'strokeWidth'){ // stroke can be unitless or unit | http://stackoverflow.com/questions/1301685/fixed-stroke-width-in-svg
      PP[p] = function(p,v){
        if (!(p in DOM)) {
          DOM[p] = function(l,p,a,b,v) {
            var _u = _u || typeof b === 'number';
            l.style[p] = !_u ? unit(a.value,b.value,b.unit,v) : number(a,b,v);
          }
        }
        return /px|%|em|vh|vw/.test(v) ? PP.box(p,v) : parseFloat(v);
      }
    } else {
      PP[p] = function(p,v){
        if (!(p in DOM)) {
          DOM[p] = function(l,p,a,b,v) {
            l.style[p] = number(a,b,v);
          }
        }
        return parseFloat(v);
      }
    } 
    K.prS[p] = function(el,p,v){
      return K.gCS(el,p) || 0;
    }
  }

  // SVG Transform
  PP['svgTransform'] = function(p,v,l){
    // register the render function
    if (!('svgTransform' in DOM)) {
      DOM['svgTransform'] = function(l,p,a,b,v){
        var tr = '', i;
        for (i in b){
          tr += i + '('; // start string
          if ( i === 'translate'){ // translate
            tr += (a[i][1] === b[i][1] && b[i][1] === 0 ) 
            ? number(a[i][0],b[i][0],v)
            : number(a[i][0],b[i][0],v) + ' ' + number(a[i][1],b[i][1],v);
          } else if ( i === 'rotate'){ // rotate
            tr += number(a[i][0],b[i][0],v) + ' ';
            tr += b[i][1] + ',' + b[i][2];
          } else { // scale, skewX or skewY
            tr +=  number(a[i],b[i],v);
          }
          tr += ') '; // end string
        }
        l.setAttribute('transform', tr.trim() );
      }
    }

    // now prepare transform
    var tf = {}, bb = l.getBBox(), cx = bb.x + bb.width/2, cy = bb.y + bb.height/2, r, cr, t, ct;

    for ( i in v ) { // populate the valuesStart and / or valuesEnd
      if (i === 'rotate'){
        r = v[i] instanceof Array ? v[i]
        : /\s/.test(v[i]) ? [v[i].split(' ')[0]*1, v[i].split(' ')[1].split(',')[0]*1, v[i].split(' ')[1].split(',')[1]*1] 
        : [v[i]*1,cx,cy];
        tf[i] = r;
      } else if (i === 'translate'){
        t = v[i] instanceof Array ? v[i] : /\,|\s/.test(v[i]) ? v[i].split(/\,|\s/) : [v[i]*1,0];
        tf[i] = [t[0] * 1||0, t[1] * 1||0];
      } else if (i === 'scale'){
        tf[i] = v[i] * 1||1;
      } else if (/skew/.test(i)) {
        tf[i] = v[i] * 1||0;
      }
    }

    // try to adjust translation when scale is used, probably we should do the same when using skews, but I think it's a waste of time
    // http://www.petercollingridge.co.uk/interactive-svg-components/pan-and-zoom-control
    if ('scale' in tf) {
      !('translate' in tf) && ( tf['translate'] = [0,0] ); // if no translate is found in current value or next value, we default to 0
      tf['translate'][0] += (1-tf['scale']) * bb.width/2;
      tf['translate'][1] += (1-tf['scale']) * bb.height/2;
      // adjust rotation transform origin and translation when skews are used, to make the animation look exactly the same as if we were't using svgTransform
      // http://stackoverflow.com/questions/39191054/how-to-compensate-translate-when-skewx-and-skewy-are-used-on-svg/39192565#39192565
      if ('rotate' in tf) {
        tf['rotate'][1] -= 'skewX' in tf ? Math.tan(tf['skewX']) * bb.height : 0;
        tf['rotate'][2] -= 'skewY' in tf ? Math.tan(tf['skewY']) * bb.width : 0;
      }
      tf['translate'][0] += 'skewX' in tf ? Math.tan(tf['skewX']) * bb.height*2 : 0;
      tf['translate'][1] += 'skewY' in tf ? Math.tan(tf['skewY']) * bb.width*2 : 0;
    } // more variations here https://gist.github.com/thednp/0b93068e20adb84658b5840ead0a07f8

    return tf;
  }

  // KUTE.prepareStart K.prS[p](el,p,to[p])
  // returns an obect with current transform attribute value
  K.prS['svgTransform'] = function(l,p,t) {
    var tr = {}, i, ctr = S.pT(l.getAttribute('transform'));
    for (i in t) { tr[i] = i in ctr ? ctr[i] : (i==='scale'?1:0); } // find a value in current attribute value or add a default value
    return tr;
  }

  S.sT = function (w){ // stackTransform - helper function that helps preserve current transform properties into the objects
    var bb = w._el.getBBox(), ctr = S.pT(w._el.getAttribute('transform')), r, t, i,
      cx = bb.x + bb.width/2, cy = bb.y + bb.height/2;
    
    for ( i in ctr ) { // populate the valuesStart
      if (i === 'translate'){
        t = ctr[i] instanceof Array ? ctr[i] : /\,|\s/.test(ctr[i]) ? ctr[i].split(/\,|\s/) : [ctr[i]*1,0];
        w._vS.svgTransform[i] = [t[0] * 1||0, t[1] * 1||0];
      } else if (i === 'scale'){
        w._vS.svgTransform[i] = ctr[i] * 1||1;
      } else if (i === 'rotate'){
        r = ctr[i] instanceof Array ? ctr[i]
        : /\s/.test(ctr[i]) ? [ctr[i].split(' ')[0]*1, ctr[i].split(' ')[1].split(',')[0]*1, ctr[i].split(' ')[1].split(',')[1]*1] 
        : [ctr[i]*1,cx,cy];
        w._vS.svgTransform[i] = r;
      } else if (/skew/.test(i)) {
        w._vS.svgTransform[i] = ctr[i] * 1||0;
      }
    }

    for (var i in w._vS.svgTransform) {
      if (!(i in w._vE.svgTransform)) { // copy existing and unused properties to the valuesEnd
        w._vE.svgTransform[i] = w._vS.svgTransform[i];
      }
      if (i === 'rotate' in w._vS.svgTransform && 'rotate' in w._vE.svgTransform){ // make sure to use the right transform origin when rotation is used
        w._vE.svgTransform.rotate[1] = w._vS.svgTransform.rotate[1] = cx;
        w._vE.svgTransform.rotate[2] = w._vS.svgTransform.rotate[2] = cy;
      }
    }
  } 
  S.pT = function (a){ // parseTransform - helper function that turns transform value from string to object
    var d = a && /\)/.test(a) ? a.split(')') : 'none', j, c ={}, p;

    if (d instanceof Array) {
      for (j=0; j<d.length; j++){
        p = d[j].split('('); p[0] !== '' && (c[p[0].replace(/\s/,'')] = p[1] );
      }
    }
    return c;
  }

  return S;
}));