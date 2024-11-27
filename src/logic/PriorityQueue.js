class PriorityQueue {
    constructor() {
        this.values = [];
    }

    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }

    dequeue() {
        if (this.isEmpty()) return null;
        return this.values.shift().val;
    }

    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }

    isEmpty() {
        return this.values.length === 0;
    }

    peek() {
        if (this.isEmpty()) return null;
        return this.values[0].val;
    }

    size() {
        return this.values.length;
    }

    clear() {
        this.values = [];
    }
}

module.exports = PriorityQueue; 