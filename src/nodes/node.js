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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.node = node;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
function node(nodeId, N, F, initialValue, isFaulty, nodesAreReady, setNodeIsReady) {
    return __awaiter(this, void 0, void 0, function* () {
        const node = (0, express_1.default)();
        node.use(express_1.default.json());
        node.use(body_parser_1.default.json());
        let nodeState = {
            killed: false,
            x: isFaulty ? null : initialValue,
            decided: isFaulty ? null : false,
            k: isFaulty ? null : 0,
        };
        let receivedValues = {};
        node.get("/status", (req, res) => {
            return res.status(isFaulty ? 500 : 200).send(isFaulty ? "faulty" : "live");
        });
        node.get("/getState", (req, res) => {
            return res.status(200).json(nodeState);
        });
        node.post("/message", (req, res) => {
            if (nodeState.killed || isFaulty) {
                return res.status(400).send("Node is stopped or faulty");
            }
            const { x, k, sender } = req.body;
            console.log(`📩 Nœud ${nodeId} reçoit de ${sender}: x=${x}, k=${k}`);
            if (x !== null && x !== "?" && k !== null) {
                receivedValues[sender] = x;
            }
            return res.status(200).send("Message received");
        });
        node.post("/finalDecision", (req, res) => {
            if (!nodeState.decided) {
                nodeState.decided = true;
                nodeState.x = req.body.x;
                console.log(`📢 Nœud ${nodeId} adopte la décision finale: x=${nodeState.x}`);
            }
            return res.status(200).send("Final decision received");
        });
        node.get("/start", (req, res) => __awaiter(this, void 0, void 0, function* () {
            if (nodeState.killed || isFaulty) {
                return res.status(400).send("Node is stopped or faulty");
            }
            console.log(`🚀 Nœud ${nodeId} démarre le consensus Ben-Or`);
            const maxSteps = 5; // Réduction du nombre de cycles
            for (let step = 0; step < maxSteps && !nodeState.decided; step++) {
                nodeState.k = step;
                receivedValues = {};
                if (!isFaulty) {
                    for (let i = 0; i < N; i++) {
                        if (i !== nodeId) {
                            try {
                                yield axios_1.default.post(`http://localhost:${config_1.BASE_NODE_PORT + i}/message`, {
                                    x: nodeState.x,
                                    k: nodeState.k,
                                    sender: nodeId,
                                });
                            }
                            catch (error) {
                                console.warn(`⚠️ Nœud ${i} injoignable`);
                            }
                        }
                    }
                }
                yield new Promise((resolve) => setTimeout(resolve, 300)); // ✅ Réduction du délai d’attente
                let votes = { 0: 0, 1: 0 };
                Object.values(receivedValues).forEach(v => {
                    if (v !== "?")
                        votes[v]++;
                });
                const majority = Math.ceil((N - F) / 2);
                if (votes[0] > majority) {
                    nodeState.x = 0;
                    nodeState.decided = true;
                }
                else if (votes[1] > majority) {
                    nodeState.x = 1;
                    nodeState.decided = true;
                }
                else {
                    nodeState.x = Math.random() < 0.5 ? 0 : 1;
                }
                // ✅ Nouvelle condition d’arrêt pour éviter le blocage
                if (step === maxSteps - 1 && !nodeState.decided) {
                    console.warn(`⏳ Nœud ${nodeId} termine après ${maxSteps} étapes sans consensus.`);
                    nodeState.decided = false;
                    break;
                }
                if (nodeState.decided) {
                    for (let i = 0; i < N; i++) {
                        if (i !== nodeId) {
                            for (let retry = 0; retry < 3; retry++) {
                                try {
                                    yield axios_1.default.post(`http://localhost:${config_1.BASE_NODE_PORT + i}/finalDecision`, {
                                        x: nodeState.x,
                                        sender: nodeId,
                                    });
                                    break;
                                }
                                catch (error) {
                                    console.warn(`⚠️ Tentative ${retry + 1} : Nœud ${i} injoignable pour la décision finale`);
                                    yield new Promise((resolve) => setTimeout(resolve, 100));
                                }
                            }
                        }
                    }
                    break;
                }
            }
            return res.status(200).send("Consensus reached");
        }));
        node.get("/stop", (req, res) => {
            nodeState.killed = true;
            console.log(`🛑 Nœud ${nodeId} arrêté`);
            return res.status(200).send("Node stopped");
        });
        const server = node.listen(config_1.BASE_NODE_PORT + nodeId, "0.0.0.0", () => {
            console.log(`✅ Nœud ${nodeId} en écoute sur le port ${config_1.BASE_NODE_PORT + nodeId}`);
            setNodeIsReady(nodeId);
        });
        return server;
    });
}
