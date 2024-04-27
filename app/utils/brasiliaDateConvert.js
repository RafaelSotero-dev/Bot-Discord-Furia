export const converterParaHorarioBrasilia = (data) => {
    // Converter a data para o horário de Brasília (UTC-3)
    var dataBrasilia = new Date(data)
    dataBrasilia.setUTCHours(dataBrasilia.getUTCHours() - 7)
    return dataBrasilia
}
