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

// A Javascript implementation of LRU cache

function DLNode(value) {
    this.prev = undefined;
    this.next = undefined;
    this.value = value;
}

function DLList() {
    this.size = 0;
    this.head = undefined;
    this.tail = undefined;
}

DLList.prototype.addFront = function addFront(node) {
    node.next = this.head;
    node.prev = undefined;
    this.head = node;
    if (!this.tail) {
        this.tail = node;
    }
    ++this.size;
}

DLList.prototype.remove = function remove(node) {
    if (!node) {
        return;
    }
    if (node === this.head) {
        this.head = this.head.next;
    }
    if (node === this.tail) {
        this.tail = this.tail.prev;
    }
    if (node.prev) {
        node.prev.next = node.next;
    }
    if (node.next) {
        node.next.prev = node.prev;
    }
    --this.size;
}

DLList.prototype.reduceSize = function reduceSize(size) {
    var diff = size - this.size
    var removedNodes = []
    while(diff > 0) {
        removedNodes.push(this.tail);
        this.tail = this.tail.prev;
        --diff;
    }
    this.tail.next = undefined;

    return removedNodes;
}

function LRUEntry(key, value) {
    this.key = key;
    this.value = value;
}

function LRUCache(maxSize) {
    this.maxSize = maxSize;
    this.list = new DLList();
    this.map = {};
    this.hits = 0;
    this.misses = 0;
}

LRUCache.prototype.put = function put(key, value) {
    var node = this.map[key];
    if (node) {
        if (this.list.head !== node) {
            this.list.remove(node);
            this.list.addFront(node);
        }
    } else {
        var entry = new LRUEntry(key, value);
        node = new DLNode(entry);
        this.map[key] = node;
        this.list.addFront(node);
    }

    if (this.list.size > this.maxSize) {
        var lastNode = this.list.tail;
        this.list.remove(lastNode);
        delete this.map[lastNode.value.key];
    }
}

LRUCache.prototype.get = function get(key) {
    var val;
    var node = this.map[key];
    if (node) {
        ++this.hits;
        val = node.value.value;
        if (this.list.head !== node) {
            this.list.remove(node);
            this.list.addFront(node);
        }
    } else {
        ++this.misses;
    }

    return val;
}

LRUCache.prototype.setMaxSize = function setMaxSize(maxSize) {
    var removedNodes = this.list.reduceSize(this.maxSize);
    for (var e in removedNodes) {
        delete this.map[e.value.key];
    }
}

LRUCache.prototype.clear = function clear() {
    this.map = {};
    this.list = new DLList();
}

LRUCache.prototype.getStats = function getStats() {
    return {
        hits: this.hits,
        misses: this.misses,
        size: this.list.size,
        maxSize: this.maxSize
    }
}

LRUCache.prototype.resetStats = function resetStats() {
    this.hits = 0;
    this.misses = 0;
}
