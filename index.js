async function updatePanel() {
  try {
    if (!config.painel || !config.msgId) return;

    const channel = await client.channels.fetch(config.painel);
    const msg = await channel.messages.fetch(config.msgId);

    let list = "";

    for (const [id, data] of pontos) {
      const time = Date.now() - data.inicio;
      list += `👨‍⚕️ <@${id}> • ${tempoRelativo(time)}\n`;
    }

    if (!list) list = "Nenhum médico em serviço";

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setDescription(`
🏥 ═════════════〔 HOSPITAL BELLA 〕═════════════

✨ SISTEMA DE PLANTÃO EM FUNCIONAMENTO

👑 RESPONSÁVEL DO PLANTÃO
${getBossList(channel.guild)}

────────────────────────────

👨‍⚕️ EQUIPE EM SERVIÇO
${list}

────────────────────────────

📊 STATUS
👥 Médicos ativos: ${pontos.size}
🕒 Atualizado: <t:${Math.floor(Date.now() / 1000)}:R>

────────────────────────────

🚨 EVENTO VÁLIDO SOMENTE HOJE
👑 Este evento depende da presença de um responsável online.
⚠️ Sem responsável ativo, o evento será encerrado imediatamente.

────────────────────────────

🚨 OBSERVAÇÕES
• Sistema automático de controle de plantão
• Registro de horas em tempo real
• Ranking atualizado continuamente
• Não deixe o ponto aberto

🏥 Hospital Bella • Sistema Profissional
`);

    await msg.edit({ embeds: [embed], components: [row()] });

  } catch (err) {
    console.log("Erro painel:", err.message);
  }
}
