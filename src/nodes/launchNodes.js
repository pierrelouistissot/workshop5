"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchNodes = launchNodes;
const node_1 = require("./node");
function launchNodes(N, // total number of nodes in the network
F, // number of faulty nodes in the network
initialValues, // initial values of each node
faultyList // list of faulty values for each node, true if the node is faulty, false otherwise
) {
    return __awaiter(this, void 0, void 0, function* () {
        if (initialValues.length !== faultyList.length || N !== initialValues.length)
            throw new Error("Arrays don't match");
        if (faultyList.filter((el) => el === true).length !== F)
            throw new Error("faultyList doesnt have F faulties");
        const promises = [];
        const nodesStates = new Array(N).fill(false);
        function nodesAreReady() {
            return nodesStates.find((el) => el === false) === undefined;
        }
        function setNodeIsReady(index) {
            nodesStates[index] = true;
        }
        // launch nodes
        for (let index = 0; index < N; index++) {
            const newPromise = (0, node_1.node)(index, N, F, initialValues[index], faultyList[index], nodesAreReady, setNodeIsReady);
            promises.push(newPromise);
        }
        const servers = yield Promise.all(promises);
        return servers;
    });
}
