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
const _1 = require(".");
const consensus_1 = require("./nodes/consensus");
const utils_1 = require("./utils");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const faultyArray = [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
        ];
        const initialValues = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        if (initialValues.length !== faultyArray.length)
            throw new Error("Lengths don't match");
        if (faultyArray.filter((faulty) => faulty === true).length >
            initialValues.length / 2)
            throw new Error("Too many faulty nodes");
        yield (0, _1.launchNetwork)(initialValues.length, faultyArray.filter((el) => el === true).length, initialValues, faultyArray);
        yield (0, utils_1.delay)(200);
        yield (0, consensus_1.startConsensus)(initialValues.length);
    });
}
main();
