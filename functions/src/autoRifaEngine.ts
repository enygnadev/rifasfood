import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = () => admin.firestore();

// Busca os templates automáticos do Firestore/config/autoTemplates
async function getAutoTemplatesFromConfig() {
  const doc = await db().collection("config").doc("autoTemplates").get();
  if (doc.exists) {
    return doc.data()?.templates || [];
  }
  return [];
}

function calcularCamposPersonalizados(tpl: any) {
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
export const autoRifaEngine = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    const templates = await getAutoTemplatesFromConfig();
    if (!templates.length) return null;
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
