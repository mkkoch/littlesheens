/* Copyright 2019 Comcast Cable Communications Management, LLC
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
var CompiledMatch = function() {
    var pathDelim = "\0";

    var isVar = function(s) {
        return typeof s == 'string' && s.charAt(0) == '?';
    };

    var isOptVar = function(s) {
        return typeof s == 'string' && s.substring(0,2) == '??';
    };

    var isAnonymous = function(s) {
        return s === "?";
    };

    var isInequal = function(v) {
        if (!isVar(v)) {
            return false;
        }

        var ieq;
        var ieqs = ["<=",">=","!=",">","<"];
        for (var i = 0; i < ieqs.length; i++) {
            ieq = ieqs[i];
            if (v.substring(1, 1+ieq.length) == ieq) {
                break;
            } else {
                ieq = null;
            }
        }
        if (!ieq) {
            return false;
        }

        return true;
    };

    var copyMap = function(m) {
        var acc = {};
        for (var p in m) {
            acc[p] = m[p];
        }
        return acc;
    };

    var doCompilePattern = function(p, path, compiledPattern) {
        switch (typeof p) {
            case 'object':
                if (Array.isArray(p)) {
                    // TODO handle array
                    return false;
                } else {
                    for (var k in p) {
                        var val = p[k];
                        var currPath = path + pathDelim + k;
                        if (isVar(k)) {
                            // TODO handle key vars
                            return false;
                        }
                        if (isVar(val)) {
                            if (isAnonymous(val)) {
                                // TODO handle anonymous
                                return false;
                            } else if (isInequal(val)) {
                                // TODO handle inequality
                                return false;
                            }
                            compiledPattern.bindings[currPath] = p[k];
                            if (!isOptVar(val)) {
                                ++compiledPattern.requiredMatches;
                            }
                        } else if (typeof val === 'object') {
                            if (doCompilePattern(val, currPath, compiledPattern) === false) {
                                return false;
                            }
                        } else {
                            compiledPattern.matchers[currPath] = p[k];
                            ++compiledPattern.requiredMatches;
                        }
                    }
                }
                break;
            default:
                // Shouldn't get here...
                return false;
        }

        return true;
    };

    var doCompileMessage = function(m, path, compiledMessage) {
        switch(typeof m) {
            case 'object':
                if (Array.isArray(m)) {
                    // TODO handle array
                    return false;
                } else {
                    for(var k in m) {
                        var val = m[k];
                        if (val !== null) {
                            var currPath = path + pathDelim + k;
                            if (typeof val === 'object') {
                                if (Array.isArray(val)) {
                                    compiledMessage[currPath] = val;
                                } else {
                                    if (doCompileMessage(val, currPath, compiledMessage) === false) {
                                        return false;
                                    }
                                }
                            } else {
                                compiledMessage[currPath] = val;
                            }
                        }
                    }
                }
                break;
            default:
                return false;
        }

        return true;
    };

    return {
    compilePattern: function (p) {
        var compiledPattern = {matchers:{}, bindings:{}, requiredMatches:0};
        if (doCompilePattern(p, "", compiledPattern)) {
            return compiledPattern;
        }

        return null;
    },
    compileMessage: function(m) {
        if (m) {
            var compiledMessage = {};
            if (doCompileMessage(m, "", compiledMessage)) {
                return compiledMessage;
            }
        }

        return null;
    },
    compiledMatch: function(ctx,cp,cm,bs) {
        Times.tick("compiledMatch");
        try {
            var nbs = copyMap(bs);
            var requiredMatchCount = 0;
            // Check literal matches
            for(var k in cp.matchers) {
                if (cm.hasOwnProperty(k)) {
                    if (cp.matchers[k] != cm[k]) {
                        return [];
                    }
                    ++requiredMatchCount;
                }
            }
            // Check binding matches
            for(var k in cp.bindings) {
                if (cm.hasOwnProperty(k)) {
                    var binding = cp.bindings[k];
                    var val = cm[k];
                    if (nbs.hasOwnProperty(binding)) {
                        var existingVal = nbs[binding];
                        if (existingVal != val) {
                            return [];
                        }
                    } else {
                        nbs[binding] = val;
                    }
                    if (!isOptVar(binding)) {
                        ++requiredMatchCount;
                    }
                }
            }

            // Make sure we matched everything expected
            if (requiredMatchCount == cp.requiredMatches) {
                return [nbs];
            } else {
                return [];
            }
        } finally {
            Times.tock("compiledMatch");
        }

    },
    };
}();
