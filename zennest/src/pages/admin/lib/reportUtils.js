// src/pages/admin/lib/reportUtils.js
import jsPDF from 'jspdf';

// Helper function to add logo to PDF
const addLogoToPDF = (pdf, x, y, width = 50, height = 18) => {
  try {
    // Zennest logo SVG as base64 data URI (zennest-logo-v2.svg)
    // This is the SVG converted to base64
    const logoBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUyIiBoZWlnaHQ9IjUzIiB2aWV3Qm94PSIwIDAgMTUyIDUzIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84Nl84KSI+PHBhdGggZD0iTTE1Ljg4NDcgNDMuMjQ4SDMxLjM4ODdWNDhIOS40MDQ2OFY0My43MjhMMjQuODYwNyAxOS4zOTJIOS40MDQ2OFYxNC42NEgzMS4zODg3VjE4LjkxMkwxNS44ODQ3IDQzLjI0OFoiIGZpbGw9IiMwMDk5NjYiLz48cGF0aCBkPSJNNTIuMTQyMyAzNy4zOEM1Mi4xNDIzIDM4LjAwNCA1Mi4xMDYzIDM4LjY2NCA1Mi4wMzQzIDM5LjM2SDM2LjI2NjNDMzYuMzg2MyA0MS4zMDQgMzcuMDQ2MyA0Mi44MjggMzguMjQ2MyA0My45MzJDMzkuNDcwMyA0NS4wMTIgNDAuOTQ2MyA0NS41NTIgNDIuNjc0MyA0NS41NTJDNDQuMDkwMyA0NS41NTIgNDUuMjY2MyA0NS4yMjggNDYuMjAyMyA0NC41OEM0Ny4xNjIzIDQzLjkwOCA0Ny44MzQzIDQzLjAyIDQ4LjIxODMgNDEuOTE2SDUxLjc0NjNDNTEuMjE4MyA0My44MTIgNTAuMTYyMyA0NS4zNiA0OC41NzgzIDQ2LjU2QzQ2Ljk5NDMgNDcuNzM2IDQ1LjAyNjMgNDguMzI0IDQyLjY3NDMgNDguMzI0QzQwLjgwMjMgNDguMzI0IDM5LjEyMjMgNDcuOTA0IDM3LjYzNDMgNDcuMDY0QzM2LjE3MDMgNDYuMjI0IDM1LjAxODMgNDUuMDM2IDM0LjE3ODMgNDMuNUMzMy4zMzgzIDQxLjk0IDMyLjkxODMgNDAuMTQgMzIuOTE4MyAzOC4xMEMzMi45MTgzIDM2LjA2IDMzLjMyNjMgMzQuMjcyIDM0LjE0MjMgMzIuNzM2QzM0Ljk1ODMgMzEuMiAzNi4wOTgzIDMwLjAyNCAzNy41NjIzIDI5LjIwOEMzOS4wNTAzIDI4LjM2OCA0MC43NTQzIDI3Ljk0OCA0Mi42NzQzIDI3Ljk0OEM0NC41NDYzIDI3Ljk0OCA0Ni4yMDIzIDI4LjM1NiA0Ny42NDIzIDI5LjE3MkM0OS4wODIzIDI5Ljk4OCA1MC4xODYzIDMxLjExNiA1MC45NTQzIDMyLjU1NkM1MS43NDYzIDMzLjk3MiA1Mi4xNDIzIDM1LjU4IDUyLjE0MjMgMzcuMzhaTTQ4Ljc1ODMgMzYuNjk2QzQ4Ljc1ODMgMzUuNDQ4IDQ4LjQ4MjMgMzQuMzggNDcuOTMwMyAzMy40OTJDNDcuMzc4MyAzMi41OCA0Ni42MjIzIDMxLjg5NiA0NS42NjIzIDMxLjQ0QzQ0LjcyNjMgMzAuOTYgNDMuNjgyMyAzMC43MiA0Mi41MzAzIDMwLjcyQzQwLjg3NDMgMzAuNzIgMzkuNDU4MyAzMS4yNDggMzguMjgyMyAzMi4zMDRDMzcuMTMwMyAzMy4zNiAzNi40NzAzIDM0LjgyNCAzNi4zMDIzIDM2LjY5Nkg0OC43NTgzWk02NC4yNzg1IDI3LjkxMkM2Ni42Nzg1IDI3LjkxMiA2OC42MjI1IDI4LjY0NCA3MC4xMTA1IDMwLjEwOEM3MS41OTg1IDMxLjU0OCA3Mi4zNDI1IDMzLjYzNiA3Mi4zNDI1IDM2LjM3MlY0OEg2OS4xMDI1VjM2Ljg0QzY5LjEwMjUgMzQuODcyIDY4LjYxMDUgMzMuMzcyIDY3LjYyNjUgMzIuMzRDNjYuNjQyNSAzMS4yODQgNjUuMjk4NSAzMC43NTYgNjMuNTk0NSAzMC43NTZDNjEuODY2NSAzMC43NTYgNjAuNDg2NSAzMS4yOTYgNTkuNDU0NSAzMi4zNzZDUzguNDQ2NSAzMy40NTYgNTcuOTQyNSAzNS4wMjggNTcuOTQyNSAzNy4wOTJWNDhINTQuNjY2NVYyOC4yNzJINTcuOTQyNVYzMS4wOEM1OC41OTA1IDMwLjA3MiA1OS40NjY1IDI5LjI5MiA2MC41NzA1IDI4Ljc0QzYxLjY5ODUgMjguMTg4IDYyLjkzNDUgMjcuOTEyIDY0LjI3ODUgMjcuOTEyWk04NS41MDU5IDI3LjkxMkM4Ny45MDU5IDI3LjkxMiA4OS44NDk5IDI4LjY0NCA5MS4zMzc5IDMwLjEwOEM5Mi44MjU5IDMxLjU0OCA5My41Njk5IDMzLjYzNiA5My41Njk5IDM2LjM3MlY0OEg5MC4zMjk5VjM2Ljg0QzkwLjMyOTkgMzQuODcyIDg5LjgzNzkgMzMuMzcyIDg4Ljg1MzkgMzIuMzRDODcuODY5OSAzMS4yODQgODYuNTI1OSAzMC43NTYgODQuODIxOSAzMC43NTZDODMuMDkzOSAzMC43NTYgODEuNzEzOSAzMS4yOTYgODAuNjgxOSAzMi4zNzZDNzkuNjczOSAzMy40NTYgNzkuMTY5OSAzNS4wMjggNzkuMTY5OSAzNy4wOTJWNDhINzUuODkzOVYyOC4yNzJINzkuMTY5OVYzMS4wOEM3OS44MTc5IDMwLjA3MiA4MC42OTM5IDI5LjI5MiA4MS43OTc5IDI4Ljc0QzgyLjkyNTkgMjguMTg4IDg0LjE2MTkgMjcuOTEyIDg1LjUwNTkgMjcuOTEyWk0xMTUuMTIxIDM3LjM4QzExNS4xMjEgMzguMDA0IDExNS4wODUgMzguNjY0IDExNS4wMTMgMzkuMzZIOTkuMjQ1MkM5OS4zNjUyIDQxLjMwNCAxMDAuMDI1IDQyLjgyOCAxMDEuMjI1IDQzLjkzMkMxMDIuNDQ5IDQ1LjAxMiAxMDMuOTI1IDQ1LjU1MiAxMDUuNjUzIDQ1LjU1MkMxMDcuMDY5IDQ1LjU1MiAxMDguMjQ1IDQ1LjIyOCAxMDkuMTgxIDQ0LjU4QzExMC4xNDEgNDMuOTA4IDExMC44MTMgNDMuMDIgMTExLjE5NyA0MS45MTZIMTE0LjcyNUMxMTQuMTk3IDQzLjgxMiAxMTMuMTQxIDQ1LjM2IDExMS41NTcgNDYuNTZDMTEwLjA5NyA0Ny43MzYgMTA4LjAwNSA0OC4zMjQgMTA1LjY1MyA0OC4zMjRDMTAzLjc4MSA0OC4zMjQgMTAyLjEwMSA0Ny45MDQgMTAwLjYxMyA0Ny4wNjRDOTkuMTQ5MiA0Ni4yMjQgOTcuOTk3MiA0NS4wMzYgOTcuMTU3MiA0My41Qzk2LjMxNzIgNDEuOTQgOTUuODk3MiA0MC4xNCA5NS44OTcyIDM4LjFDOTUuODk3MiAzNi4wNiA5Ni4zMDUyIDM0LjI3MiA5Ny4xMjEyIDMyLjczNkM5Ny45MzcyIDMxLjIgOTkuMDc3MiAzMC4wMjQgMTAwLjU0MSAyOS4yMDhDMTAyLjAyOSAyOC4zNjggMTAzLjczMyAyNy45NDggMTA1LjY1MyAyNy45NDhDMTA3LjUyNSAyNy45NDggMTA5LjE4MSAyOC4zNTYgMTEwLjYyMSAyOS4xNzJDMTEyLjA2MSAyOS45ODggMTEzLjE2NSAzMS4xMTYgMTEzLjkzMyAzMi41NTZDMTE0LjcyNSAzMy45NzIgMTE1LjEyMSAzNS41OCAxMTUuMTIxIDM3LjM4Wk0xMTEuNzM3IDM2LjY5NkMxMTEuNzM3IDM1LjQ0OCAxMTEuNDYxIDM0LjM4IDExMC45MDkgMzMuNDkyQzExMC4zNTcgMzIuNTggMTA5LjYwMSAzMS44OTYgMTA4LjY0MSAzMS40NEMxMDcuNzA1IDMwLjk2IDEwNi42NjEgMzAuNzIgMTA1LjUwOSAzMC43MkMxMDMuODUzIDMwLjcyIDEwMi40MzcgMzEuMjQ4IDEwMS4yNjEgMzIuMzA0QzEwMC4xMDkgMzMuMzYgOTkuNDQ5MiAzNC44MjQgOTkuMjgxMiAzNi42OTZIMTEwLjczN1pNMTI0LjYyOSA0OC4zMjRDEMTIzLjExNyA0OC4zMjQgMTIxLjc2MSA0OC4wNzIgMTIwLjU2MSA0Ny41NjhDMTE5LjM2MSA0Ny4wNCAxMTguNDEzIDQ2LjMyIDExNy43MTcgNDUuNDA4QzExNy4wMjEgNDQuNDcyIDExNi42MzcgNDMuNDA0IDExNi41NjUgNDIuMjA0SDEyMC4wNDlDMTIwLjE0NSA0My4xODggMTIwLjYwMSA0My45OTIgMTIxLjMxNyA0NC42MTZDMTIyLjE1NyA0NS4yNCAxMjMuMjQ5IDQ1LjU1MiAxMjQuNTkzIDQ1LjU1MkMxMjUuODQxIDQ1LjU1MiAxMjYuODI1IDQ1LjI3NiAxMjcuNTQ1IDQ0LjcyNEMxMjguMjY1IDQ0LjE3MiAxMjguNjI1IDQzLjQ3NiAxMjguNjI1IDQyLjYzNkMxMjguNjI1IDQxLjc3MiAxMjguMjQxIDQxLjEzNiAxMjcuNDczIDQwLjcyOEMxMjYuNzA1IDQwLjI5NiAxMjUuNTE3IDM5Ljg3NiAxMjMuOTA5IDM5LjQ2OEMxMjIuNDQ1IDM5LjA4NCAxMjEuMjQ1IDM4LjcgMTIwLjMwOSAzOC4zMTZDMTE5LjM5NyAzNy45MDggMTE4LjYwNSAzNy4zMiAxMTcuOTMzIDM2LjU1MkMxMTcuMjg1IDM1Ljc2IDExNi45NjEgMzQuNzI4IDExNi45NjEgMzMuNDU2QzExNi45NjEgMzIuNDQ4IDExNy4yNjEgMzEuNTI0IDExNy44NjEgMzAuNjg0QzExOC40NjEgMjkuODQ0IDExOS4zMTMgMjkuMTg0IDEyMC40MTcgMjguNzA0QzEyMS41MjEgMjguMiAxMjIuNzgxIDI3Ljk0OCAxMjQuMTk3IDI3Ljk0OEMxMjYuMzgxIDI3Ljk0OCAxMjguMTQ1IDI4LjUgMTI5LjQ4OSAyOS42MDRDMTMwLjgzMyAzMC43MDggMTMxLjU1MyAzMi4yMiAxMzEuNjQ5IDM0LjE0SDEyOC4zNzNDMTI4LjMwMSAzMy4xMDggMTI3Ljg4MSAzMi4yOCAxMjcuMTEzIDMxLjY1NkMxMjYuMzY5IDMxLjAzMiAxMjUuMzYxIDMwLjcyIDEyNC4wODkgMzAuNzJDMTIyLjkxMyAzMC43MiAxMjEuOTc3IDMwLjk3MiAxMjEuMjgxIDMxLjQ3NkMxMjAuNTg1IDMxLjk4IDEyMC4yMzcgMzIuNjQgMTIwLjIzNyAzMy40NTZDMTIwLjIzNyAzNC4xMDQgMTIwLjQ0MSAzNC42NDQgMTIwLjg0OSAzNS4wNzZDMTIxLjI4MSAzNS40ODQgMTIxLjgwOSAzNS44MiAxMjIuNDMzIDM2LjA4NEMxMjMuMDgxIDM2LjMyNCAxMjMuOTY5IDM2LjYgMTI1LjA5NyAzNi45MTJDMTI2LjUxMyAzNy4yOTYgMTI3LjY2NSAzNy42OCAxMjguNTUzIDM4LjA2NEMxMjkuNDQxIDM4LjQyNCAxMzAuMTk3IDM4Ljk3NiAxMzAuODIxIDM5LjcyQzEzMS40NjkgNDAuNDY0IDEzMS44MDUgNDEuNDM2IDEzMS44MjkgNDIuNjM2QzEzMS44MjkgNDMuNzE2IDEzMS41MjkgNDQuNjg4IDEzMC45MjkgNDUuNTUyQzEzMC4zMjkgNDYuNDE2IDEyOS40NzcgNDcuMSAxMjguMzczIDQ3LjYwNEMxMjcuMjkzIDQ4LjA4NCAxMjYuMDQ1IDQ4LjMyNCAxMjQuNjI5IDQ4LjMyNFpNMTM4LjY1IDMwLjk3MlY0Mi42QzEzOC42NSA0My41NiAxMzguODU0IDQ0LjI0NCAxMzkuMjYyIDQ0LjY1MkMxMzkuNjcgNDUuMDM2IDE0MC4zNzggNDUuMjI4IDE0MS4zODYgNDUuMjI4SDE0My43OThWNDhIMTQwLjg0NkMxMzkuMDIyIDQ4IDEzNy42NTQgNDcuNTggMTM2Ljc0MiA0Ni43NEMxMzUuODMgNDUuOSAxMzUuMzc0IDQ0LjUyIDEzNS4zNzQgNDIuNlYzMC45NzJIMTMyLjgxOFYyOC4yNzJIMTM1LjM3NFYyMy4zMDRIMTM4LjY1VjI4LjI3MkgxNDMuNzk4VjMwLjk3MkgxMzguNjVaIiBmaWxsPSIjNEE0QTRBIi8+PHBhdGggZD0iTTUzLjQyOTIgMTIuNzA3MkM0Mi42NTEzIDEwLjgyNyAzNy4yMTM5IDE3LjYyNDggMzIuMzEwNSAyMy4xNjM2TDM0LjAyMDQgMjQuOTI4N0wzNi4yMjg1IDIyLjQ3NjhDMzYuNjYxNiAyMi45MjgxIDM3LjEzNjggMjMuMzM4NSAzNy41MjY5IDIzLjUxNTJDNDkuNDQ3MiAyOC45MTQ4IDYxLjQwOTggOC44MTc0OCA2MS40MDk4IDguODE3NDhDNTkuMzAxMiAxMC44NjQyIDUxLjU4NzQgNy43NDUzMyA0NS42NTY3IDYuNTU5NzhDMzkuNzI1OSA1LjM3NDIzIDM1LjM4MDcgOS43ODQ5NyAzNC4zNTU4IDEyLjMyMjZDMzMuMzMwOSAxNC44NjAzIDM0LjMzMDUgMTcuOTM5NyAzNC4zMzA1IDE3LjkzOTdDNDIuNTkyNiA3Ljc5ODQ3IDUzLjQyOTIgMTIuNzA3MiA1My40MjkyIDEyLjcwNzJaIiBmaWxsPSIjMDA5OTY2Ii8+PC9nPjxkZWZzPjxjbGlwUGF0aCBpZD0iY2xpcDBfODZfOCI+PHJlY3Qgd2lkdGg9IjE1MiIgaGVpZ2h0PSI1MyIgZmlsbD0id2hpdGUiLz48L2NsaXBQYXRoPjwvZGVmcz48L3N2Zz4=';
    
    // Try to add SVG image - jsPDF supports SVG through addImage
    pdf.addImage(logoBase64, 'SVG', x, y, width, height);
    return height;
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
    return 0;
  }
};

/**
 * Generate a PDF report from data
 * @param {Object} params - Report parameters
 * @param {string} params.type - Report type identifier
 * @param {string} params.title - Report title
 * @param {Array} params.rows - Data rows to include
 * @param {Array} params.columns - Column definitions [{key, label, width?}]
 * @param {Object} params.meta - Metadata {dateFrom, dateTo, generatedBy}
 */
export async function generatePDFReport({ type, title, rows = [], columns = [], meta = {} }) {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Header Section with Logo and Branding
    const headerHeight = 50;
    
    // Background with gradient effect (emerald tint)
    pdf.setDrawColor(16, 185, 129); // emerald-600 border
    pdf.setFillColor(240, 253, 244); // emerald-50 background
    pdf.roundedRect(margin, yPos, contentWidth, headerHeight, 4, 4, 'FD'); // Filled rounded rectangle
    
    // Add logo image (left side)
    const logoWidth = 60;
    const logoHeight = 21;
    const logoX = margin + 10;
    const logoY = yPos + (headerHeight - logoHeight) / 2;
    addLogoToPDF(pdf, logoX, logoY, logoWidth, logoHeight);
    
    // Report Title (Right side, larger and bold)
    pdf.setFontSize(18);
    pdf.setTextColor(17, 24, 39); // gray-900
    pdf.setFont(undefined, 'bold');
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, pageWidth - margin - 10 - titleWidth, yPos + 22);
    
    // Date under title
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128); // gray-500
    pdf.setFont(undefined, 'normal');
    const dateText = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - margin - 10 - dateWidth, yPos + 32);
    
    // Decorative line under header
    pdf.setDrawColor(16, 185, 129);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos + headerHeight, pageWidth - margin, yPos + headerHeight);
    
    yPos = yPos + headerHeight + 10;

    // Metadata Section with better styling
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128); // gray-500
    
    let metaY = yPos;
    
    if (meta.dateFrom || meta.dateTo) {
      const dateRange = [
        meta.dateFrom ? new Date(meta.dateFrom).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'All time',
        meta.dateTo ? new Date(meta.dateTo).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'Present'
      ].join(' - ');
      pdf.text(`Date Range: ${dateRange}`, margin + 10, metaY);
      metaY += 6;
    }

    pdf.text(`Generated: ${new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`, margin + 10, metaY);
    metaY += 6;

    if (meta.generatedBy) {
      pdf.text(`Generated by: ${meta.generatedBy}`, margin + 10, metaY);
      metaY += 6;
    }

    if (meta.totalRecords !== undefined) {
      pdf.text(`Total Records: ${meta.totalRecords.toLocaleString()}`, margin + 10, metaY);
      metaY += 6;
    }

    if (meta.filter) {
      pdf.text(`Filter: ${meta.filter}`, margin + 10, metaY);
      metaY += 6;
    }

    yPos = metaY + 8;

    // Table Section
    if (columns.length > 0 && rows.length > 0) {
      // Table Header with styled background
      pdf.setFillColor(16, 185, 129); // emerald-600
      pdf.setDrawColor(16, 185, 129);
      pdf.setTextColor(255, 255, 255); // white text
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      
      // Calculate column widths
      const totalWidth = columns.reduce((sum, col) => sum + (col.width || 1), 0);
      const colWidths = columns.map(col => ((col.width || 1) / totalWidth) * contentWidth);
      const headerHeight = 10;

      // Draw header row with background
      let xPos = margin;
      columns.forEach((col, idx) => {
        pdf.roundedRect(xPos, yPos - 7, colWidths[idx], headerHeight, 1, 1, 'FD'); // Filled
        pdf.setTextColor(255, 255, 255);
        const label = col.label || col.key;
        const maxWidth = colWidths[idx] - 4;
        const textLines = pdf.splitTextToSize(label, maxWidth);
        pdf.text(textLines[0] || '', xPos + 3, yPos - 1);
        xPos += colWidths[idx];
      });
      yPos += 5;

      // Draw data rows with alternating colors
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      
      rows.forEach((row, rowIdx) => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          // Re-add header on new page
          yPos = margin + 20;
          xPos = margin;
          pdf.setFillColor(16, 185, 129);
          pdf.setDrawColor(16, 185, 129);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(9);
          columns.forEach((col, idx) => {
            pdf.roundedRect(xPos, yPos - 7, colWidths[idx], headerHeight, 1, 1, 'FD');
            const label = col.label || col.key;
            const maxWidth = colWidths[idx] - 4;
            const textLines = pdf.splitTextToSize(label, maxWidth);
            pdf.text(textLines[0] || '', xPos + 3, yPos - 1);
            xPos += colWidths[idx];
          });
          yPos += 5;
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(8);
        }

        // Alternate row background
        if (rowIdx % 2 === 0) {
          pdf.setFillColor(249, 250, 251); // gray-50
          xPos = margin;
          columns.forEach((col, colIdx) => {
            pdf.roundedRect(xPos, yPos - 6, colWidths[colIdx], 8, 1, 1, 'FD');
            xPos += colWidths[colIdx];
          });
        }

        xPos = margin;
        pdf.setTextColor(17, 24, 39); // gray-900
        columns.forEach((col, colIdx) => {
          const value = row[col.key] ?? '';
          const displayValue = typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : String(value);
          
          // Truncate long text
          const maxWidth = colWidths[colIdx] - 6;
          const textLines = pdf.splitTextToSize(displayValue, maxWidth);
          
          // Handle multi-line text
          textLines.forEach((textLine, lineIdx) => {
            if (lineIdx === 0) {
              pdf.text(textLine || '', xPos + 3, yPos - 1);
            } else if (lineIdx < 2) { // Limit to 2 lines per cell
              pdf.text(textLine || '', xPos + 3, yPos - 1 + (lineIdx * 4));
            }
          });
          
          xPos += colWidths[colIdx];
        });
        yPos += 9; // Increased spacing for better readability
      });
    } else {
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text('No data available', margin + 10, yPos);
    }

    // Footer on each page
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Footer line
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      
      // Footer text
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(
        `ZENNEST Admin Dashboard`,
        margin + 5,
        pageHeight - 12,
        { align: 'left' }
      );
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin - 5,
        pageHeight - 12,
        { align: 'right' }
      );
      pdf.setFontSize(6);
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    // Generate filename
    const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${slugify(title)}-${Date.now()}.pdf`;

    pdf.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Print a report using HTML
 * @param {Object} params - Print parameters
 * @param {string} params.title - Report title
 * @param {string} params.htmlContent - HTML content to print
 */
export function printReport({ title, htmlContent }) {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Try to get logo path - in production this should be accessible
    const logoPath = '/src/assets/zennest-logo-v2.svg';

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Zennest Admin Report</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                margin: 1.5cm 1cm;
                size: A4;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 30px 20px;
              color: #111827;
              background: #fff;
              line-height: 1.6;
            }
            .header {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border: 2px solid #10b981;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 30px;
              box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
            }
            .header-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 15px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-container img {
              height: 45px;
              width: auto;
            }
            .logo-text {
              font-size: 32px;
              font-weight: 800;
              color: #10b981;
              letter-spacing: 1px;
              text-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
            }
            .logo-subtitle {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .report-title {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
              text-align: right;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 12px;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid rgba(16, 185, 129, 0.2);
            }
            .meta-item {
              color: #4b5563;
              font-size: 12px;
            }
            .meta-label {
              font-weight: 600;
              color: #6b7280;
              display: inline-block;
              min-width: 100px;
            }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 25px;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            thead {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            th {
              color: white;
              font-weight: 700;
              padding: 14px 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-right: 1px solid rgba(255, 255, 255, 0.2);
            }
            th:last-child {
              border-right: none;
            }
            tbody tr {
              border-bottom: 1px solid #e5e7eb;
              transition: background-color 0.2s;
            }
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            tbody tr:hover {
              background-color: #f3f4f6;
            }
            td {
              padding: 12px;
              font-size: 12px;
              color: #374151;
              border-right: 1px solid #e5e7eb;
            }
            td:last-child {
              border-right: none;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #6b7280;
              font-size: 11px;
            }
            .footer-left {
              font-weight: 600;
              color: #10b981;
            }
            .footer-right {
              color: #9ca3af;
            }
            @media print {
              .header {
                page-break-inside: avoid;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-top">
              <div class="logo-container">
                <img src="data:image/svg+xml,%3Csvg width='152' height='53' viewBox='0 0 152 53' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_86_8)'%3E%3Cpath d='M15.8847 43.248H31.3887V48H9.40468V43.728L24.8607 19.392H9.40468V14.64H31.3887V18.912L15.8847 43.248Z' fill='%23009966'/%3E%3Cpath d='M52.1423 37.38C52.1423 38.004 52.1063 38.664 52.0343 39.36H36.2663C36.3863 41.304 37.0463 42.828 38.2463 43.932C39.4703 45.012 40.9463 45.552 42.6743 45.552C44.0903 45.552 45.2663 45.228 46.2023 44.58C47.1623 43.908 47.8343 43.02 48.2183 41.916H51.7463C51.2183 43.812 50.1623 45.36 48.5783 46.56C46.9943 47.736 45.0263 48.324 42.6743 48.324C40.8023 48.324 39.1223 47.904 37.6343 47.064C36.1703 46.224 35.0183 45.036 34.1783 43.5C33.3383 41.94 32.9183 40.14 32.9183 38.1C32.9183 36.06 33.3263 34.272 34.1423 32.736C34.9583 31.2 36.0983 30.024 37.5623 29.208C39.0503 28.368 40.7543 27.948 42.6743 27.948C44.5463 27.948 46.2023 28.356 47.6423 29.172C49.0823 29.988 50.1863 31.116 50.9543 32.556C51.7463 33.972 52.1423 35.58 52.1423 37.38ZM48.7583 36.696C48.7583 35.448 48.4823 34.38 47.9303 33.492C47.3783 32.58 46.6223 31.896 45.6623 31.44C44.7263 30.96 43.6823 30.72 42.5303 30.72C40.8743 30.72 39.4583 31.248 38.2823 32.304C37.1303 33.36 36.4703 34.824 36.3023 36.696H48.7583ZM64.2785 27.912C66.6785 27.912 68.6225 28.644 70.1105 30.108C71.5985 31.548 72.3425 33.636 72.3425 36.372V48H69.1025V36.84C69.1025 34.872 68.6105 33.372 67.6265 32.34C66.6425 31.284 65.2985 30.756 63.5945 30.756C61.8665 30.756 60.4865 31.296 59.4545 32.376C58.4465 33.456 57.9425 35.028 57.9425 37.092V48H54.6665V28.272H57.9425V31.08C58.5905 30.072 59.4665 29.292 60.5705 28.74C61.6985 28.188 62.9345 27.912 64.2785 27.912ZM85.5059 27.912C87.9059 27.912 89.8499 28.644 91.3379 30.108C92.8259 31.548 93.5699 33.636 93.5699 36.372V48H90.3299V36.84C90.3299 34.872 89.8379 33.372 88.8539 32.34C87.8699 31.284 86.5259 30.756 84.8219 30.756C83.0939 30.756 81.7139 31.296 80.6819 32.376C79.6739 33.456 79.1699 35.028 79.1699 37.092V48H75.8939V28.272H79.1699V31.08C79.8179 30.072 80.6939 29.292 81.7979 28.74C82.9259 28.188 84.1619 27.912 85.5059 27.912ZM115.121 37.38C115.121 38.004 115.085 38.664 115.013 39.36H99.2452C99.3652 41.304 100.025 42.828 101.225 43.932C102.449 45.012 103.925 45.552 105.653 45.552C107.069 45.552 108.245 45.228 109.181 44.58C110.141 43.908 110.813 43.02 111.197 41.916H114.725C114.197 43.812 113.141 45.36 111.557 46.56C109.973 47.736 108.005 48.324 105.653 48.324C103.781 48.324 102.101 47.904 100.613 47.064C99.1492 46.224 97.9972 45.036 97.1572 43.5C96.3172 41.94 95.8972 40.14 95.8972 38.1C95.8972 36.06 96.3052 34.272 97.1212 32.736C97.9372 31.2 99.0772 30.024 100.541 29.208C102.029 28.368 103.733 27.948 105.653 27.948C107.525 27.948 109.181 28.356 110.621 29.172C112.061 29.988 113.165 31.116 113.933 32.556C114.725 33.972 115.121 35.58 115.121 37.38ZM111.737 36.696C111.737 35.448 111.461 34.38 110.909 33.492C110.357 32.58 109.601 31.896 108.641 31.44C107.705 30.96 106.661 30.72 105.509 30.72C103.853 30.72 102.437 31.248 101.261 32.304C100.109 33.36 99.4492 34.824 99.2812 36.696H111.737ZM124.629 48.324C123.117 48.324 121.761 48.072 120.561 47.568C119.361 47.04 118.413 46.32 117.717 45.408C117.021 44.472 116.637 43.404 116.565 42.204H119.949C120.045 43.188 120.501 43.992 121.317 44.616C122.157 45.24 123.249 45.552 124.593 45.552C125.841 45.552 126.825 45.276 127.545 44.724C128.265 44.172 128.625 43.476 128.625 42.636C128.625 41.772 128.241 41.136 127.473 40.728C126.705 40.296 125.517 39.876 123.909 39.468C122.445 39.084 121.245 38.7 120.309 38.316C119.397 37.908 118.605 37.32 117.933 36.552C117.285 35.76 116.961 34.728 116.961 33.456C116.961 32.448 117.261 31.524 117.861 30.684C118.461 29.844 119.313 29.184 120.417 28.704C121.521 28.2 122.781 27.948 124.197 27.948C126.381 27.948 128.145 28.5 129.489 29.604C130.833 30.708 131.553 32.22 131.649 34.14H128.373C128.301 33.108 127.881 32.28 127.113 31.656C126.369 31.032 125.361 30.72 124.089 30.72C122.913 30.72 121.977 30.972 121.281 31.476C120.585 31.98 120.237 32.64 120.237 33.456C120.237 34.104 120.441 34.644 120.849 35.076C121.281 35.484 121.809 35.82 122.433 36.084C123.081 36.324 123.969 36.6 125.097 36.912C126.513 37.296 127.665 37.68 128.553 38.064C129.441 38.424 130.197 38.976 130.821 39.72C131.469 40.464 131.805 41.436 131.829 42.636C131.829 43.716 131.529 44.688 130.929 45.552C130.329 46.416 129.477 47.1 128.373 47.604C127.293 48.084 126.045 48.324 124.629 48.324ZM138.65 30.972V42.6C138.65 43.56 138.854 44.244 139.262 44.652C139.67 45.036 140.378 45.228 141.386 45.228H143.798V48H140.846C139.022 48 137.654 47.58 136.742 46.74C135.83 45.9 135.374 44.52 135.374 42.6V30.972H132.818V28.272H135.374V23.304H138.65V28.272H143.798V30.972H138.65Z' fill='%234A4A4A'/%3E%3Cpath d='M53.4292 12.7072C42.6513 10.827 37.2139 17.6248 32.3105 23.1636L34.0204 24.9287L36.2285 22.4768C36.6616 22.9281 37.1368 23.3385 37.5269 23.5152C49.4472 28.9148 61.4098 8.81748 61.4098 8.81748C59.3012 10.8642 51.5874 7.74533 45.6567 6.55978C39.7259 5.37423 35.3807 9.78497 34.3558 12.3226C33.3309 14.8603 34.3305 17.9397 34.3305 17.9397C42.5926 7.79847 53.4292 12.7072 53.4292 12.7072Z' fill='%23009966'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_86_8'%3E%3Crect width='152' height='53' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E" 
                     alt="Zennest Logo" 
                     style="height: 45px; width: auto; margin-right: 12px;" />
                <div>
                  <div class="logo-text">ZENNEST</div>
                  <div class="logo-subtitle">Admin Dashboard</div>
                </div>
              </div>
              <div class="report-title">${title}</div>
            </div>
            <div class="meta">
              <div class="meta-item">
                <span class="meta-label">Generated:</span>
                <span>${new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Report Type:</span>
                <span>${title}</span>
              </div>
            </div>
          </div>
          <div class="content">
            ${htmlContent}
          </div>
          <div class="footer">
            <div class="footer-left">ZENNEST Admin Dashboard</div>
            <div class="footer-right">Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    return { success: true };
  } catch (error) {
    console.error('Error printing report:', error);
    throw error;
  }
}

/**
 * Generate contract PDF
 * @param {Object} params - Contract parameters
 * @param {string} params.template - Contract template text
 * @param {Object} params.data - Contract data (hostName, guestName, etc.)
 */
export function generateContractPDF({ template = '', data = {} }) {
  try {
    const pdf = new jsPDF();
    let yPos = 20;
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    // Header
    pdf.setFontSize(18);
    pdf.setTextColor(16, 185, 129);
    pdf.text('Zennest Booking Contract', margin, yPos);
    yPos += 15;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Contract Date: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Replace placeholders in template
    let contractText = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      contractText = contractText.replace(regex, data[key] || '');
    });

    // Split template into lines and add to PDF
    if (contractText) {
      const lines = contractText.split('\n');
      pdf.setFontSize(10);
      
      lines.forEach(line => {
        if (yPos > 280) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Handle long lines by splitting them
        const maxWidth = contentWidth - 4;
        const textLines = pdf.splitTextToSize(line || '', maxWidth);
        textLines.forEach(textLine => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(textLine, margin, yPos);
          yPos += 7;
        });
      });
    } else {
      pdf.text('Contract terms and conditions...', margin, yPos);
    }

    const filename = `zennest-contract-${Date.now()}.pdf`;
    pdf.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    throw error;
  }
}

