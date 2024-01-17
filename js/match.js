/* Copyright 2018 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// A Javascript implementation of Rules Core (and Sheens) pattern matching
//
// Status: Frequently compiles.

// function(CTX,P,M,BS), where CTX is an unused context, P is a
// pattern, M is a message, and BS are input bindings.
//
// Returns null or a set of sets of bindings.
var match = function() {

    var isVar = function(s) {
	return typeof s == 'string' && s.charAt(0) == '?';
    };

    var isOptVar = function(s) {
	return typeof s == 'string' && s.substring(0,2) == '??';
    };

    var copyMap = function(m) {
	var acc = {};
	for (var p in m) {
	    acc[p] = m[p];
	}
	return acc;
    };

    var copyArray = function(xs) {
	return xs.slice();
    }

    var isAnonymous = function(s) {
	return s === "?";
    }

    var extend = function(bs, b, v) {
	var acc = copyMap(bs);
	acc[b] = v;
	return acc;
    };

    var match;

    var matchWithBindings = function(ctx, bss, v, mv) {
	var acc = [];
	for (var i = 0; i < bss.length; i++) {
	    var bs = bss[i];
	    acc = acc.concat(match(ctx, v, mv, bs));
	}
	return acc;
    };

    var arraycatMatch = function(ctx, bss, p, m, varCount) {
	if (varCount === undefined) {
	    varCount = 0;
	}

	// The pattern should be an array.
	if (!Array.isArray(p)) {
	    throw "internal error: pattern " + JSON.stringify(p) + " isn't an array";
	}

	if (!Array.isArray(m)) {
	    return [];
	}

	if (p.length == 0) {
	    // An empty pattern array matches any array.
	    return bss;
	}

	// Recursive implementation
	var y = p[0];
	if (isVar(y)) {
	    if (0 < varCount) {
		throw "can't have more than one variable in array";
	    }
	    varCount++;
	}

	var acc = []; // Accumulate sets of output bindings.
	for (var i = 0; i < bss.length; i++) {
	    var bs = bss[i];
	    // How many ways can we match y? An array is a *set*, not
	    // a list.
	    var some = false;
	    for (var j = 0; j < m.length; j++) {
		var x = m[j];
		var bss_ = match(ctx, y, x, bs);
		// Filter bindings based on remaining pattern and the
		// message with the current element removed.  This
		// approach is probably not optimal, but it's easier
		// to understand.
		var p_ = p.slice(i+1);
		var m_ = copyArray(m); m_.splice(j,1);
		bss_ = arraycatMatch(ctx, bss_, p_, m_, varCount);
		for (var k = 0; k < bss_.length; k++) {
		    acc.push(bss_[k]);
		    some = true;
		}
	    }
	    if (!some && isOptVar(y)) {
		acc.push(bs);
	    }
	}

	return acc;
    };

    var mapcatMatch = function(ctx, bss, p, m) {
	var varCount = 0;
	for (var k in p) {
	    var v = p[k];
	    if (isVar(k)) {
		if (0 < varCount) {
		    throw "can't have more than one property variable";
		}
		varCount++;
		var acc = [];
		for (var mk in m) {
		    var mv = m[mk];
		    var ext = matchWithBindings(ctx, copyArray(bss), k, mk);
		    if (ext.length == 0) {
			continue;
		    }
		    ext = matchWithBindings(ctx, ext, v, mv);
		    if (ext.length == 0) {
			continue;
		    }
		    acc = acc.concat(ext);
		}
		bss = acc;
	    } else {
		var mv = m[k];
		if (mv === undefined) {
		    if (isOptVar(v)) {
			continue;
		    }
		    return [];
		}
		var acc = matchWithBindings(ctx, bss, v, mv);
		if (acc.length == 0) {
		    return [];
		}
		bss = acc;
	    }
	}
	return bss;
    };

    inequal = function(ctx,m,bs,v) {
	if (!isVar(v)) {
	    return {applied: false};
	}
	var x = bs[v];
	if (x === undefined) {
	    return {applied: false};
	}
	if ((typeof x) !== 'number') {
	    return {applied: false};
	}
	if ((typeof m) !== 'number') {
	    return {applied: false};
	}

	var ieq, vv;
	var ieqs = ["<=",">=","!=",">","<"];
	for (var i = 0; i < ieqs.length; i++) {
	    ieq = ieqs[i];
	    if (v.substring(1, 1+ieq.length) == ieq) {
		vv = "?" + v.substring(1+ieq.length);
		break;
	    } else {
		ieq = null;
	    }
	}
	if (!ieq) {
	    return {applied: false};
	}

	var satisfied = false;
	switch (ieq) {
	case "<":
	    satisfied = m < x;
	    break;
	case "<=":
	    satisfied = m <= x;
	    break;
	case ">":
	    satisfied = m > x;
	    break;
	case ">=":
	    satisfied = m >= x;
	    break;
	case "!=":
	    satisfied = m != x;
	    break;
	default:
	    throw "internal error: ieq=" + ieq;
	}

	if (!satisfied) {
	    return {applied: true, bss: []};
	}

	var vvx = bs[vv];
	if (vvx !== undefined) {
	    if ((typeof vvx) !== 'number') {
		return {applied: false};
	    }
	    if (vvx != m) {
		return {applied: true, bss: []};
	    }
	    return {applied: true, bss: [bs]};
	}

	bs[vv] = m;

	return {applied: true, bss: [bs]};
    };

    match = function(ctx,p,m,bs) {
	if (!bs) {
	    bs = [];
	}
	if (isVar(p)) {
	    if (isAnonymous(p)) {
		return [bs];
	    }
	    var ieq = inequal(ctx, m, bs, p);
	    if (ieq.applied) {
		return ieq.bss;
	    }
	    var binding = bs[p];
	    if (binding) {
		return match(ctx, binding, m, bs);
	    } else {
		return [extend(bs, p, m)];
	    }
	} else {
	    switch (typeof p) {
	    case 'object':
		if (Array.isArray(p)) {
		    if (Array.isArray(m)) {
			return arraycatMatch(ctx, [bs], p, m);
		    } else {
			return [];
		    }
		}
		switch (typeof m) {
		case 'object':
		    if (null === p) {
			return [];
		    }
		    if (p.length == 0) {
			return [bs];
		    }
		    return mapcatMatch(ctx, [bs], p, m);
		default:
		    return [];
		}
	    default:
		if (p == m) {
		    return [bs];
		}
		return [];
	    }
	}
    };

	var compileToPointersRec = function(o, io, pstr, ka, ps) {
		if (Array.isArray(o) === false && typeof o === 'object') {
			for (var k in o) {
				var nka = copyArray(ka);
				nka.push(k);
				compileToPointersRec(o[k], io, pstr + "/" + k.replace("~","~0").replace("/","~1"), nka, ps);
			}
			if (io) {
				ps[pstr] = { v: o, ka: ka };
			}
		} else {
			ps[pstr] = { v: o, ka: ka };
		}
	}

	var compileToPointers = function(o, io) {
		var ps = {};
		compileToPointersRec(o, io, "", [], ps);
		return ps;
	}

	var canDoOptimizedMatch = function(cp) {
		for (var p in cp) {
			if (p.includes("?")) {
				return false;
			}
			pv = cp[p].v;
			if (Array.isArray(pv)) {
				return false;
			}
		}
		return true;
	};

	var resolvePointer = function(ka, m) {
		var v = m;
		for(var i = 0; i < ka.length; ++i) {
			v = v[ka[i]];
		}
		return v;
	};

	var optimizedMatch = function(ctx,p,m,bs) {
		var cp;
		var canOptimize = false;
		if(ctx && ctx.PatternCache) {
			var patternStr = JSON.stringify(p);
			var ce = ctx.PatternCache.get(patternStr);
			if (!ce) {
				Times.tick("compilePattern");
				try {
					ce = {};
					ce.cp = compileToPointers(p, false);
					ce.canOptimize = canDoOptimizedMatch(ce.cp);
					Object.seal(ce);
					ctx.PatternCache.put(patternStr, ce);
				} finally {
				Times.tock("compilePattern");
				}
			}
			cp = ce.cp;
			canOptimize = ce.canOptimize;
		}
		if (!canOptimize) {
			Times.tick("standardMatch");
			try {
				return match(ctx,p,m,bs);
			} finally {
				Times.tock("standardMatch");
			}

		}

		//print("Using compiled pattern",JSON.stringify(cp),"for pattern",JSON.stringify(p));

		Times.tick("optimizedMatch");
		try {
			var ob = copyMap(bs);

			var didMatch = true;
			for (var k in cp) {
				var pv = cp[k].v;
				var mv = resolvePointer(cp[k].ka, m);
				//print("Resolving key",k,"patternValue",pv,"messageValue",mv);
				if (mv !== undefined) {
					if (isVar(pv)) {
						if (!isAnonymous(pv)) {
							var ieq = inequal(ctx, mv, ob, pv);
							if (ieq.applied) {
								if (ieq.bss.length > 0) {
									ob[pv] = ieq.bss[0][pv];
								} else {
									didMatch = false;
									break;
								}
							} else {
								var bv = ob[pv];
								if (bv === undefined) {
									ob[pv] = mv;
								} else if (bv != mv) {
									didMatch = false;
									//print("Reject match, binding value != message value");
									break;
								}
							}
						}
					} else if (mv != pv) {
						didMatch = false;
						//print("Reject match, pattern value != message value");
						break;
					}
				} else {
					if (!isOptVar(pv)) {
						//print("Reject match, missing required message value for key",k);
						didMatch = false;
						break;
					}
				}
			}

			if (!didMatch) {
				return [];
			}

			return [ob];
		} finally {
			Times.tock("optimizedMatch");
		}


	};

    return function(ctx,p,m,bs) {
	Times.tick("match");
	//print("");
	//print("Matching",JSON.stringify(m),"against",JSON.stringify(p),"with bindings",JSON.stringify(bs));

	try {
		if (!ctx) {
			ctx = {};
		}
		var res = undefined;
		if (ctx.UseOptimizedMatch) {
			res = optimizedMatch(ctx,p,m,bs);
		} else {
			Times.tick("standardMatch");
			try {
				res = match(ctx,p,m,bs);
			} finally {
				Times.tock("standardMatch");
			}

		}
		print("Match result", JSON.stringify(res));
		return res;
	} finally {
	    Times.tock("match");
		//print("");
	}
    };
}();

