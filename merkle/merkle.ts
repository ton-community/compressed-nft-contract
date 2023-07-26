import { sha256_sync } from 'ton-crypto';

function hash(b: Buffer): Buffer {
    return sha256_sync(b);
}

export function bufferToInt(b: Buffer): bigint {
    return BigInt('0x' + b.toString('hex'));
}

export function hashToInt(b: Buffer): bigint {
    return bufferToInt(hash(b));
}

export class MerkleTree {
    constructor(public readonly buf: bigint[], public readonly depth: number, public readonly hash: (a: bigint, b: bigint) => bigint) {}

    static fromLeaves(leaves: bigint[], hash: (a: bigint, b: bigint) => bigint) {
        const depth = Math.log2(leaves.length);
        if (!Number.isInteger(depth)) {
            throw new Error('Bad leaves array');
        }
        const buf: bigint[] = new Array(leaves.length * 2);
        for (let i = 0; i < leaves.length; i++) {
            buf[leaves.length + i] = leaves[i];
        }
        for (let i = depth - 1; i >= 0; i--) {
            for (let j = Math.pow(2, i); j < Math.pow(2, i+1); j++) {
                buf[j] = hash(buf[2*j], buf[2*j+1]);
            }
        }
        return new MerkleTree(buf, depth, hash);
    }

    leafIdxToNodeIdx(i: number) {
        return Math.pow(2, this.depth) + i;
    }

    root() {
        return this.buf[1];
    }

    leaf(i: number) {
        return this.buf[Math.pow(2, this.depth) + i];
    }

    node(i: number) {
        return this.buf[i];
    }

    proofWithIndices(i: number) {
        const proof: { index: number, value: bigint }[] = [];
        for (let j = 0; j < this.depth; j++) {
            i ^= 1;
            proof.push({ value: this.node(i), index: i });
            i >>= 1;
        }
        return proof;
    }

    proofForNode(i: number): bigint[] {
        return this.proofWithIndices(i).map(v => v.value);
    }

    generateUpdate(leaves: bigint[]) {
        const totalLeaves = 1 << this.depth;
        if (leaves.length >= totalLeaves) {
            throw new Error('Cannot fully update the tree');
        }
        const from = totalLeaves - leaves.length;
        const nodes = leaves.map((l, i) => ({ index: totalLeaves + from + i, value: l, depth: this.depth }));
        let updated = false;
        do {
            if (nodes.length < 2) {
                break;
            }
            for (let i = 0; i < nodes.length - 1; i++) {
                if (nodes[i].depth === nodes[i+1].depth && (nodes[i].index ^ nodes[i+1].index) === 1) {
                    nodes.splice(i, 2, { index: nodes[i].index >> 1, value: this.hash(nodes[i].value, nodes[i+1].value), depth: nodes[i].depth - 1 });
                }
            }
        } while (updated);
        const proof = this.proofWithIndices(totalLeaves + from).filter(p => nodes.findIndex(n => n.index === p.index) === -1);
        return {
            nodes,
            proof,
        };
    }
}
