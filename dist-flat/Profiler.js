"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.profile = profile;
/* tslint:disable:ban-types */
function init() {
    var defaults = {
        data: {},
        total: 0,
    };
    if (!Memory.profiler) {
        Memory.profiler = defaults;
    }
    var cli = {
        clear: function () {
            var running = isEnabled();
            Memory.profiler = defaults;
            if (running) {
                Memory.profiler.start = Game.time;
            }
            return "Profiler Memory cleared";
        },
        output: function () {
            outputProfilerData();
            return "Done";
        },
        start: function () {
            Memory.profiler.start = Game.time;
            return "Profiler started";
        },
        status: function () {
            if (isEnabled()) {
                return "Profiler is running";
            }
            return "Profiler is stopped";
        },
        stop: function () {
            if (!isEnabled()) {
                return;
            }
            var timeRunning = Game.time - Memory.profiler.start;
            Memory.profiler.total += timeRunning;
            delete Memory.profiler.start;
            return "Profiler stopped";
        },
        toString: function () {
            return "Profiler.start() - Starts the profiler\n" +
                "Profiler.stop() - Stops/Pauses the profiler\n" +
                "Profiler.status() - Returns whether is profiler is currently running or not\n" +
                "Profiler.output() - Pretty-prints the collected profiler data to the console\n" +
                this.status();
        },
    };
    return cli;
}
function wrapFunction(obj, key, className) {
    var descriptor = Reflect.getOwnPropertyDescriptor(obj, key);
    if (!descriptor || descriptor.get || descriptor.set) {
        return;
    }
    if (key === "constructor") {
        return;
    }
    var originalFunction = descriptor.value;
    if (!originalFunction || typeof originalFunction !== "function") {
        return;
    }
    // set a key for the object in memory
    if (!className) {
        className = obj.constructor ? "".concat(obj.constructor.name) : "";
    }
    var memKey = className + ":".concat(key);
    // set a tag so we don't wrap a function twice
    var savedName = "__".concat(key, "__");
    if (Reflect.has(obj, savedName)) {
        return;
    }
    Reflect.set(obj, savedName, originalFunction);
    ///////////
    Reflect.set(obj, key, function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (isEnabled()) {
            var start = Game.cpu.getUsed();
            var result = originalFunction.apply(this, args);
            var end = Game.cpu.getUsed();
            record(memKey, end - start);
            return result;
        }
        return originalFunction.apply(this, args);
    });
}
function profile(target, key, _descriptor) {
    if (!__PROFILER_ENABLED__) {
        return;
    }
    if (key) {
        // case of method decorator
        wrapFunction(target, key);
        return;
    }
    // case of class decorator
    var ctor = target;
    if (!ctor.prototype) {
        return;
    }
    var className = ctor.name;
    Reflect.ownKeys(ctor.prototype).forEach(function (k) {
        wrapFunction(ctor.prototype, k, className);
    });
}
function isEnabled() {
    return Memory.profiler.start !== undefined;
}
function record(key, time) {
    if (!Memory.profiler.data[key]) {
        Memory.profiler.data[key] = {
            calls: 0,
            time: 0,
        };
    }
    Memory.profiler.data[key].calls++;
    Memory.profiler.data[key].time += time;
}
function outputProfilerData() {
    var totalTicks = Memory.profiler.total;
    if (Memory.profiler.start) {
        totalTicks += Game.time - Memory.profiler.start;
    }
    ///////
    // Process data
    var totalCpu = 0; // running count of average total CPU use per tick
    var calls;
    var time;
    var result;
    var data = Reflect.ownKeys(Memory.profiler.data).map(function (key) {
        calls = Memory.profiler.data[key].calls;
        time = Memory.profiler.data[key].time;
        result = {};
        result.name = "".concat(key);
        result.calls = calls;
        result.cpuPerCall = time / calls;
        result.callsPerTick = calls / totalTicks;
        result.cpuPerTick = time / totalTicks;
        totalCpu += result.cpuPerTick;
        return result;
    });
    data.sort(function (lhs, rhs) { return rhs.cpuPerTick - lhs.cpuPerTick; });
    ///////
    // Format data
    var output = "";
    // get function name max length
    var longestName = (_.max(data, function (d) { return d.name.length; })).name.length + 2;
    //// Header line
    output += _.padRight("Function", longestName);
    output += _.padLeft("Tot Calls", 12);
    output += _.padLeft("CPU/Call", 12);
    output += _.padLeft("Calls/Tick", 12);
    output += _.padLeft("CPU/Tick", 12);
    output += _.padLeft("% of Tot\n", 12);
    ////  Data lines
    data.forEach(function (d) {
        output += _.padRight("".concat(d.name), longestName);
        output += _.padLeft("".concat(d.calls), 12);
        output += _.padLeft("".concat(d.cpuPerCall.toFixed(2), "ms"), 12);
        output += _.padLeft("".concat(d.callsPerTick.toFixed(2)), 12);
        output += _.padLeft("".concat(d.cpuPerTick.toFixed(2), "ms"), 12);
        output += _.padLeft("".concat((d.cpuPerTick / totalCpu * 100).toFixed(0), " %\n"), 12);
    });
    //// Footer line
    output += "".concat(totalTicks, " total ticks measured");
    output += "\t\t\t".concat(totalCpu.toFixed(2), " average CPU profiled per tick");
    console.log(output);
}
// debugging
// function printObject(obj: object) {
//   const name = obj.constructor ? obj.constructor.name : (obj as any).name;
//   console.log("  Keys of :", name, ":");
//   Reflect.ownKeys(obj).forEach((k) => {
//     try {
//       console.log(`    ${k}: ${Reflect.get(obj, k)}`);
//     } catch (e) {
//       // nothing
//     }
//   });
// }
