import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_NODE_PORT } from "../config";
import { NodeState, Value } from "../types";

export async function node(
    nodeId: number,
    N: number,
    F: number,
    initialValue: Value,
    isFaulty: boolean,
    nodesAreReady: () => boolean,
    setNodeIsReady: (index: number) => void
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  let messagesPhase1: { round: number; value: 0 | 1 }[] = [];
  let messagesPhase2: { round: number; value: 0 | 1 }[] = [];

  const sanitizedInitialValue: 0 | 1 | null = isFaulty ? null : (initialValue === "?" ? null : initialValue as 0 | 1);

  const nodeState: NodeState = {
    killed: false,
    x: sanitizedInitialValue,
    decided: isFaulty ? null : false,
    k: isFaulty ? null : 0
  };

  async function broadcast(phase: number, round: number, value: 0 | 1) {
    if (isFaulty || nodeState.killed) return;
    const promises = [];
    for (let i = 0; i < N; i++) {
      if (i !== nodeId) {
        promises.push(
            fetch(`http://localhost:${BASE_NODE_PORT + i}/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: nodeId, phase, round, value })
            }).catch(() => { })
        );
      }
    }
    await Promise.all(promises);
  }

  async function benOrRound() {
    if (nodeState.killed || isFaulty) return;


    if (N === 1) {
      nodeState.decided = true;
      nodeState.x = nodeState.x === null ? 1 : nodeState.x;
      return;
    }

    // Phase 1: Proposition
    if (nodeState.x !== null) {
      await broadcast(1, nodeState.k!, nodeState.x as 0 | 1);
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const phase1Messages = messagesPhase1.filter(m => m.round === nodeState.k);
    const counts1 = { 0: 0, 1: 0 };
    phase1Messages.forEach(msg => counts1[msg.value]++);

    let proposedValue: 0 | 1 = 1;

    const quorum = Math.floor((N + 1) / 2);
    if (counts1[1] >= quorum) {
      proposedValue = 1;
    } else if (counts1[0] >= quorum) {
      proposedValue = 0;
    }

    // Phase 2: Décision
    await broadcast(2, nodeState.k!, proposedValue);
    await new Promise(resolve => setTimeout(resolve, 100));

    const phase2Messages = messagesPhase2.filter(m => m.round === nodeState.k);
    const counts2 = { 0: 0, 1: 0 };
    phase2Messages.forEach(msg => counts2[msg.value]++);

    const consensusThreshold = Math.ceil((N - F) / 2);
    if (counts2[1] >= consensusThreshold) {
      nodeState.x = 1;
      nodeState.decided = true;
    } else if (counts2[0] >= consensusThreshold) {
      nodeState.x = 0;
      nodeState.decided = true;
    } else {
      nodeState.x = proposedValue;
      nodeState.decided = false;
    }

    nodeState.k!++;

    if (!nodeState.decided) {
      setTimeout(benOrRound, 100);
    }
  }

  node.post("/message", (req: Request, res: Response) => {
    if (nodeState.killed || isFaulty) {
      res.status(500).send("faulty");
      return;
    }

    const { phase, round, value } = req.body;
    if (typeof value === "number" && (value === 0 || value === 1)) {
      if (phase === 1) {
        messagesPhase1.push({ round, value });
      } else if (phase === 2) {
        messagesPhase2.push({ round, value });
      }
    }
    res.json({ success: true });
  });

  node.get("/start", async (req: Request, res: Response) => {
    if (nodeState.killed || isFaulty) {
      res.status(500).send("faulty");
      return;
    }

    messagesPhase1 = [];
    messagesPhase2 = [];
    nodeState.k = 0;
    nodeState.decided = false;
    nodeState.x = sanitizedInitialValue;

    setTimeout(benOrRound, 100);
    res.json({ success: true });
  });

  node.get("/status", (req: Request, res: Response) => {
    if (isFaulty) {
      res.status(500).send("faulty");
      return;
    }
    res.send("live");
  });

  node.get("/stop", async (req: Request, res: Response) => {
    if (isFaulty) {
      res.status(500).send("faulty");
      return;
    }

    nodeState.killed = true;
    nodeState.decided = null;
    res.json({ success: true });
  });

  node.get("/getState", (req: Request, res: Response) => {
    if (isFaulty) {
      res.status(500).json({
        killed: null,
        x: null,
        decided: null,
        k: null
      });
      return;
    }
    res.json(nodeState);
  });

  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(`Nœud ${nodeId} en écoute sur le port ${BASE_NODE_PORT + nodeId}`);
    setNodeIsReady(nodeId);
  });

  return server;
}