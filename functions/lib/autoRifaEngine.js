"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRifaEngine = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
// Busca os templates automáticos do Firestore/config/autoTemplates
async function getAutoTemplatesFromConfig() {
    const doc = await db().collection("config").doc("autoTemplates").get();
    if (doc.exists) {
        return doc.data()?.templates || [];
    }
    return [];
}
function calcularCamposPersonalizados(tpl) {
    // Se valorPorNumero não estiver definido, calcula
    let valorPorNumero = tpl.valorPorNumero;
    let meta = tpl.meta;
    if ((tpl.valorQueVouPagar > 0 || tpl.valorQueVouPagar === 0) && (tpl.porcentoQueQueroGanhar > 0 || tpl.porcentoQueQueroGanhar === 0) && (tpl.quantidadeDeTickets > 0)) {
        const valor = Number(tpl.valorQueVouPagar) || 0;
        const porcento = Number(tpl.porcentoQueQueroGanhar) || 0;
        const qtd = Number(tpl.quantidadeDeTickets) || 0;
        if (valor > 0 && qtd > 0) {
            const valorTotal = valor + (valor * porcento / 100);
            valorPorNumero = Math.ceil((valorTotal / qtd) * 100) / 100;
            meta = qtd;
        }
    }
    return {
        ...tpl,
        valorPorNumero,
        meta,
    };
}
// Executa o motor automático de rifas usando os templates editados
exports.autoRifaEngine = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async (context) => {
    const templates = await getAutoTemplatesFromConfig();
    if (!templates.length)
        return null;
    const rifasSnap = await db().collection("rifas").where("status", "==", "ativa").get();
    const activeProductIds = new Set(rifasSnap.docs.map(doc => doc.data().productId || doc.data().id));
    for (const product of templates) {
        if (!activeProductIds.has(product.id)) {
            const prodFinal = calcularCamposPersonalizados(product);
            await db().collection("rifas").add({
                ...prodFinal,
                vendidos: 0,
                locked: false,
                status: "ativa",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
    }
    return null;
});
