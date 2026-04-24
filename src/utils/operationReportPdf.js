function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatCurrency(value, currencyCode = "CRC") {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

function formatDateTime(value) {
    if (!value) {
        return "Sin registrar";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("es-CR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

export function downloadOperationReportPdf(report) {
    if (typeof window === "undefined") {
        throw new Error("La descarga del PDF solo esta disponible en el navegador.");
    }

    const popup = window.open("", "_blank", "width=980,height=820");

    if (!popup) {
        throw new Error("El navegador bloqueo la ventana del PDF. Permite popups para continuar.");
    }

    const pricingLabels = {
        solo_sala: "Solo sala",
        solo_insumos: "Solo insumos",
        sala_mas_insumos: "Sala mas insumos"
    };

    const chargeDecisionLabels = {
        cobrable: "Cobrable",
        exonerado: "Exonerado"
    };

    const supplyRows = (report.supplies ?? [])
        .map(
            (supply) => `
                <tr>
                    <td>${escapeHtml(supply.itemNameSnapshot)}</td>
                    <td>${escapeHtml(supply.itemCategorySnapshot || "-")}</td>
                    <td>${escapeHtml(supply.unitSnapshot)}</td>
                    <td>${escapeHtml(supply.quantity)}</td>
                    <td>${escapeHtml(formatCurrency(supply.unitCost, report.currencyCode))}</td>
                    <td>${escapeHtml(formatCurrency(supply.unitPrice, report.currencyCode))}</td>
                    <td>${escapeHtml(formatCurrency(supply.subtotalPrice, report.currencyCode))}</td>
                </tr>
            `
        )
        .join("");

    popup.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Reporte operativo #${escapeHtml(report.id)}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 24px;
                color: #12313f;
                background: #f4fafb;
              }
              h1, h2, h3, p { margin: 0; }
              .sheet {
                max-width: 920px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 18px 42px rgba(16, 38, 44, 0.12);
              }
              .hero {
                display: flex;
                justify-content: space-between;
                gap: 16px;
                border-bottom: 2px solid #dcecf1;
                padding-bottom: 18px;
                margin-bottom: 18px;
              }
              .eyebrow {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 999px;
                background: #d9f2ee;
                color: #0f4e5f;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.06em;
              }
              .meta, .totals {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 14px;
                margin: 18px 0;
              }
              .card {
                border: 1px solid #dcecf1;
                border-radius: 10px;
                padding: 14px;
                background: #f9fcfd;
              }
              .card strong {
                display: block;
                margin-top: 6px;
                font-size: 18px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 14px;
              }
              th, td {
                padding: 10px;
                border-bottom: 1px solid #deeaef;
                text-align: left;
                font-size: 13px;
              }
              th {
                background: #eff7fa;
              }
              .section-title {
                margin-top: 22px;
                margin-bottom: 10px;
                color: #0f4e5f;
              }
              .footer {
                margin-top: 22px;
                font-size: 12px;
                color: #5f7281;
              }
              @media print {
                body {
                  background: #fff;
                  padding: 0;
                }
                .sheet {
                  box-shadow: none;
                  border-radius: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="hero">
                <div>
                  <span class="eyebrow">Reporte operativo</span>
                  <h1>${escapeHtml(report.procedureName)}</h1>
                  <p>Reserva #${escapeHtml(report.reservationId)} · ${escapeHtml(report.reservationDate)} · ${escapeHtml(report.reservationStartTime)} - ${escapeHtml(report.reservationEndTime)}</p>
                </div>
                <div>
                  <p><strong>Estado del cobro:</strong> ${escapeHtml(report.paymentStatus)}</p>
                  <p><strong>Decision:</strong> ${escapeHtml(chargeDecisionLabels[report.chargeDecision] ?? report.chargeDecision)}</p>
                  <p><strong>Generado:</strong> ${escapeHtml(formatDateTime(report.generatedAt))}</p>
                </div>
              </div>

              <div class="meta">
                <div class="card">
                  <h3>Paciente</h3>
                  <strong>${escapeHtml(report.patientNameSnapshot)}</strong>
                </div>
                <div class="card">
                  <h3>Sala</h3>
                  <strong>${escapeHtml(report.roomNameSnapshot)}</strong>
                  <span>${escapeHtml(report.branchNameSnapshot || "Sin sucursal")}</span>
                </div>
                <div class="card">
                  <h3>Usuario responsable</h3>
                  <strong>${escapeHtml(report.reservationUserName || "Sin asignar")}</strong>
                </div>
                <div class="card">
                  <h3>Modalidad</h3>
                  <strong>${escapeHtml(pricingLabels[report.pricingMode] ?? report.pricingMode)}</strong>
                </div>
              </div>

              <h2 class="section-title">Resumen de cobro</h2>
              <div class="totals">
                <div class="card">
                  <h3>Monto sala</h3>
                  <strong>${escapeHtml(formatCurrency(report.roomChargeAmount, report.currencyCode))}</strong>
                </div>
                <div class="card">
                  <h3>Total insumos</h3>
                  <strong>${escapeHtml(formatCurrency(report.suppliesTotalAmount, report.currencyCode))}</strong>
                </div>
                <div class="card">
                  <h3>Costo de insumos</h3>
                  <strong>${escapeHtml(formatCurrency(report.suppliesTotalCost, report.currencyCode))}</strong>
                </div>
                <div class="card">
                  <h3>Total final</h3>
                  <strong>${escapeHtml(formatCurrency(report.totalBilledAmount, report.currencyCode))}</strong>
                </div>
              </div>

              <h2 class="section-title">Insumos y equipo usado</h2>
              ${
                  supplyRows
                      ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>Categoria</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>Costo unitario</th>
                        <th>Precio unitario</th>
                        <th>Subtotal cobrado</th>
                      </tr>
                    </thead>
                    <tbody>${supplyRows}</tbody>
                  </table>
                `
                      : `<p>No se registraron insumos para esta operacion.</p>`
              }

              <h2 class="section-title">Observaciones</h2>
              <p>${escapeHtml(report.notes || "Sin observaciones operativas.")}</p>

              ${
                  report.chargeDecision === "exonerado"
                      ? `
                  <h2 class="section-title">Exoneracion autorizada</h2>
                  <p><strong>Motivo:</strong> ${escapeHtml(report.waiverReason || "Sin detalle")}</p>
                  <p><strong>Autorizado por:</strong> ${escapeHtml(report.waivedByUserName || "Admin")}</p>
                `
                      : ""
              }

              <div class="footer">
                Pago registrado: ${escapeHtml(formatDateTime(report.paidAt))} · Metodo: ${escapeHtml(report.paymentMethod || "otro")}
              </div>
            </div>
          </body>
        </html>
    `);

    popup.document.close();
    popup.focus();

    window.setTimeout(() => {
        popup.print();
    }, 200);
}
