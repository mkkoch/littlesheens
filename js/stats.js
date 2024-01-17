/* Copyright 2024 Comcast Cable Communications Management, LLC
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

var Stats = function() {
    var counts = {};
    var enabled = true;

    return {
	enable: function() {
	    enabled = true;
	},
	disable: function() {
	    enabled = false;
	},
	isEnabled: function() {
		return enabled;
	},
	record: function(what) {
	    if (!enabled) return;
        if (!(what in counts)) {
            counts[what]=1;
        } else {
            ++counts[what];
        }
	},
	summary: function() {
	    return counts;
	},
	reset: function() {
	    counts = {};
	}
    };
}();

