// src/pages/admin/Policies/TermsEditor.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaFileContract, FaEdit, FaSave, FaSpinner, FaInfoCircle, FaPrint, FaFilePdf, FaHome } from 'react-icons/fa';
import { fetchTermsAndConditions, saveTermsAndConditions, fetchHouseRules, saveHouseRules } from '../lib/dataFetchers';
import { printReport } from '../lib/reportUtils';
import useAuth from '../../../hooks/useAuth';
import jsPDF from 'jspdf';

const TermsEditor = ({ showToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('terms'); // 'terms' or 'houseRules'
  const [termsContent, setTermsContent] = useState('');
  const [houseRulesContent, setHouseRulesContent] = useState('');
  const [editingTerms, setEditingTerms] = useState(false);
  const [editingHouseRules, setEditingHouseRules] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingHouseRules, setSavingHouseRules] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [terms, houseRules] = await Promise.all([
        fetchTermsAndConditions(),
        fetchHouseRules()
      ]);
      setTermsContent(terms);
      setHouseRulesContent(houseRules);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTerms = async () => {
    try {
      const content = await fetchTermsAndConditions();
      setTermsContent(content);
    } catch (error) {
      console.error('Error loading terms:', error);
      showToast('Failed to load terms', 'error');
    }
  };

  const loadHouseRules = async () => {
    try {
      const content = await fetchHouseRules();
      setHouseRulesContent(content);
    } catch (error) {
      console.error('Error loading house rules:', error);
      showToast('Failed to load house rules', 'error');
    }
  };

  const handleSaveTerms = async () => {
    if (!termsContent.trim()) {
      showToast('Terms content cannot be empty', 'error');
      return;
    }

    setSavingTerms(true);
    try {
      await saveTermsAndConditions(termsContent, user?.uid || 'admin');
      showToast('Terms & Conditions updated successfully');
      setEditingTerms(false);
    } catch (error) {
      console.error('Error saving terms:', error);
      showToast('Failed to save terms', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  const handleSaveHouseRules = async () => {
    if (!houseRulesContent.trim()) {
      showToast('House rules content cannot be empty', 'error');
      return;
    }

    setSavingHouseRules(true);
    try {
      await saveHouseRules(houseRulesContent, user?.uid || 'admin');
      showToast('House Rules updated successfully');
      setEditingHouseRules(false);
    } catch (error) {
      console.error('Error saving house rules:', error);
      showToast('Failed to save house rules', 'error');
    } finally {
      setSavingHouseRules(false);
    }
  };

  const handlePrintTerms = () => {
    if (!termsContent.trim()) {
      showToast('No terms content to print', 'error');
      return;
    }

    try {
      const htmlContent = `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          ${termsContent}
        </div>
      `;

      printReport({
        title: 'Terms & Conditions',
        htmlContent
      });

      showToast('Print dialog opened');
    } catch (error) {
      console.error('Error printing terms:', error);
      showToast('Failed to print terms', 'error');
    }
  };

  const handlePrintHouseRules = () => {
    if (!houseRulesContent.trim()) {
      showToast('No house rules content to print', 'error');
      return;
    }

    try {
      const htmlContent = `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          ${houseRulesContent}
        </div>
      `;

      printReport({
        title: 'House Rules',
        htmlContent
      });

      showToast('Print dialog opened');
    } catch (error) {
      console.error('Error printing house rules:', error);
      showToast('Failed to print house rules', 'error');
    }
  };

  // Helper function to export PDF (reusable for both terms and house rules)
  const exportPDF = async (content, title) => {
    if (!content.trim()) {
      showToast(`No ${title.toLowerCase()} content to export`, 'error');
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper function to add logo to PDF
      const addLogoToPDF = (pdf, x, y, width = 60, height = 21) => {
        try {
          // Zennest logo SVG as base64 data URI (zennest-logo-v2.svg)
          const logoBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUyIiBoZWlnaHQ9IjUzIiB2aWV3Qm94PSIwIDAgMTUyIDUzIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF84Nl84KSI+PHBhdGggZD0iTTE1Ljg4NDcgNDMuMjQ4SDMxLjM4ODdWNDhIOS40MDQ2OFY0My43MjhMMjQuODYwNyAxOS4zOTJIOS40MDQ2OFYxNC42NEgzMS4zODg3VjE4LjkxMkwxNS44ODQ3IDQzLjI0OFoiIGZpbGw9IiMwMDk5NjYiLz48cGF0aCBkPSJNNTIuMTQyMyAzNy4zOEM1Mi4xNDIzIDM4LjAwNCA1Mi4xMDYzIDM4LjY2NCA1Mi4wMzQzIDM5LjM2SDM2LjI2NjNDMzYuMzg2MyA0MS4zMDQgMzcuMDQ2MyA0Mi44MjggMzguMjQ2MyA0My45MzJDMzkuNDcwMyA0NS4wMTIgNDAuOTQ2MyA0NS41NTIgNDIuNjc0MyA0NS41NTJDNDQuMDkwMyA0NS41NTIgNDUuMjY2MyA0NS4yMjggNDYuMjAyMyA0NC41OEM0Ny4xNjIzIDQzLjkwOCA0Ny44MzQzIDQzLjAyIDQ4LjIxODMgNDEuOTE2SDUxLjc0NjNDNTEuMjE4MyA0My44MTIgNTAuMTYyMyA0NS4zNiA0OC41NzgzIDQ2LjU2QzQ2Ljk5NDMgNDcuNzM2IDQ1LjAyNjMgNDguMzI0IDQyLjY3NDMgNDguMzI0QzQwLjgwMjMgNDguMzI0IDM5LjEyMjMgNDcuOTA0IDM3LjYzNDMgNDcuMDY0QzM2LjE3MDMgNDYuMjI0IDM1LjAxODMgNDUuMDM2IDM0LjE3ODMgNDMuNUMzMy4zMzgzIDQxLjk0IDMyLjkxODMgNDAuMTQgMzIuOTE4MyAzOC4xMEMzMi45MTgzIDM2LjA2IDMzLjMyNjMgMzQuMjcyIDM0LjE0MjMgMzIuNzM2QzM0Ljk1ODMgMzEuMiAzNi4wOTgzIDMwLjAyNCAzNy41NjIzIDI5LjIwOEMzOS4wNTAzIDI4LjM2OCA0MC43NTQzIDI3Ljk0OCA0Mi42NzQzIDI3Ljk0OEM0NC41NDYzIDI3Ljk0OCA0Ni4yMDIzIDI4LjM1NiA0Ny42NDIzIDI5LjE3MkM0OS4wODIzIDI5Ljk4OCA1MC4xODYzIDMxLjExNiA1MC45NTQzIDMyLjU1NkM1MS43NDYzIDMzLjk3MiA1Mi4xNDIzIDM1LjU4IDUyLjE0MjMgMzcuMzhaTTQ4Ljc1ODMgMzYuNjk2QzQ4Ljc1ODMgMzUuNDQ4IDQ4LjQ4MjMgMzQuMzggNDcuOTMwMyAzMy40OTJDNDcuMzc4MyAzMi41OCA0Ni42MjIzIDMxLjg5NiA0NS42NjIzIDMxLjQ0QzQ0LjcyNjMgMzAuOTYgNDMuNjgyMyAzMC43MiA0Mi41MzAzIDMwLjcyQzQwLjg3NDMgMzAuNzIgMzkuNDU4MyAzMS4yNDggMzguMjgyMyAzMi4zMDRDMzcuMTMwMyAzMy4zNiAzNi40NzAzIDM0LjgyNCAzNi4zMDIzIDM2LjY5Nkg0OC43NTgzWk02NC4yNzg1IDI3LjkxMkM2Ni42Nzg1IDI3LjkxMiA2OC42MjI1IDI4LjY0NCA3MC4xMTA1IDMwLjEwOEM3MS41OTg1IDMxLjU0OCA3Mi4zNDI1IDMzLjYzNiA3Mi4zNDI1IDM2LjM3MlY0OEg2OS4xMDI1VjM2Ljg0QzY5LjEwMjUgMzQuODcyIDY4LjYxMDUgMzMuMzcyIDY3LjYyNjUgMzIuMzRDNjYuNjQyNSAzMS4yODQgNjUuMjk4NSAzMC43NTYgNjMuNTk0NSAzMC43NTZDNjEuODY2NSAzMC43NTYgNjAuNDg2NSAzMS4yOTYgNTkuNDU0NSAzMi4zNzZDUzguNDQ2NSAzMy40NTYgNTcuOTQyNSAzNS4wMjggNTcuOTQyNSAzNy4wOTJWNDhINTQuNjY2NVYyOC4yNzJINTcuOTQyNVYzMS4wOEM1OC41OTA1IDMwLjA3MiA1OS40NjY1IDI5LjI5MiA2MC41NzA1IDI4Ljc0QzYxLjY5ODUgMjguMTg4IDYyLjkzNDUgMjcuOTEyIDY0LjI3ODUgMjcuOTEyWk04NS41MDU5IDI3LjkxMkM4Ny45MDU5IDI3LjkxMiA4OS44NDk5IDI4LjY0NCA5MS4zMzc5IDMwLjEwOEM5Mi44MjU5IDMxLjU0OCA5My41Njk5IDMzLjYzNiA5My41Njk5IDM2LjM3MlY0OEg5MC4zMjk5VjM2Ljg0QzkwLjMyOTkgMzQuODcyIDg5LjgzNzkgMzMuMzcyIDg4Ljg1MzkgMzIuMzRDODcuODY5OSAzMS4yODQgODYuNTI1OSAzMC43NTYgODQuODIxOSAzMC43NTZDODMuMDkzOSAzMC43NTYgODEuNzEzOSAzMS4yOTYgODAuNjgxOSAzMi4zNzZDNzkuNjczOSAzMy40NTYgNzkuMTY5OSAzNS4wMjggNzkuMTY5OSAzNy4wOTJWNDhINzUuODkzOVYyOC4yNzJINzkuMTY5OVYzMS4wOEM3OS44MTc5IDMwLjA3MiA4MC42OTM5IDI5LjI5MiA4MS43OTc5IDI4Ljc0QzgyLjkyNTkgMjguMTg4IDg0LjE2MTkgMjcuOTEyIDg1LjUwNTkgMjcuOTEyWk0xMTUuMTIxIDM3LjM4QzExNS4xMjEgMzguMDA0IDExNS4wODUgMzguNjY0IDExNS4wMTMgMzkuMzZIOTkuMjQ1MkM5OS4zNjUyIDQxLjMwNCAxMDAuMDI1IDQyLjgyOCAxMDEuMjI1IDQzLjkzMkMxMDIuNDQ5IDQ1LjAxMiAxMDMuOTI1IDQ1LjU1MiAxMDUuNjUzIDQ1LjU1MkMxMDcuMDY5IDQ1LjU1MiAxMDguMjQ1IDQ1LjIyOCAxMDkuMTgxIDQ0LjU4QzExMC4xNDEgNDMuOTA4IDExMC44MTMgNDMuMDIgMTExLjE5NyA0MS45MTZIMTE0LjcyNUMxMTQuMTk3IDQzLjgxMiAxMTMuMTQxIDQ1LjM2IDExMS41NTcgNDYuNTZDMTEwLjA5NyA0Ny43MzYgMTA4LjAwNSA0OC4zMjQgMTA1LjY1MyA0OC4zMjRDMTAzLjc4MSA0OC4zMjQgMTAyLjEwMSA0Ny45MDQgMTAwLjYxMyA0Ny4wNjRDOTkuMTQ5MiA0Ni4yMjQgOTcuOTk3MiA0NS4wMzYgOTcuMTU3MiA0My41Qzk2LjMxNzIgNDEuOTQgOTUuODk3MiA0MC4xNCA5NS44OTcyIDM4LjFDOTUuODk3MiAzNi4wNiA5Ni4zMDUyIDM0LjI3MiA5Ny4xMjEyIDMyLjczNkM5Ny45MzcyIDMxLjIgOTkuMDc3MiAzMC4wMjQgMTAwLjU0MSAyOS4yMDhDMTAyLjAyOSAyOC4zNjggMTAzLjczMyAyNy45NDggMTA1LjY1MyAyNy45NDhDMTA3LjUyNSAyNy45NDggMTA5LjE4MSAyOC4zNTYgMTEwLjYyMSAyOS4xNzJDMTEyLjA2MSAyOS45ODggMTEzLjE2NSAzMS4xMTYgMTEzLjkzMyAzMi41NTZDMTE0LjcyNSAzMy45NzIgMTE1LjEyMSAzNS41OCAxMTUuMTIxIDM3LjM4Wk0xMTEuNzM3IDM2LjY5NkMxMTEuNzM3IDM1LjQ0OCAxMTEuNDYxIDM0LjM4IDExMC45MDkgMzMuNDkyQzExMC4zNTcgMzIuNTggMTA5LjYwMSAzMS44OTYgMTA4LjY0MSAzMS40NEMxMDcuNzA1IDMwLjk2IDEwNi42NjEgMzAuNzIgMTA1LjUwOSAzMC43MkMxMDMuODUzIDMwLjcyIDEwMi40MzcgMzEuMjQ4IDEwMS4yNjEgMzIuMzA0QzEwMC4xMDkgMzMuMzYgOTkuNDQ5MiAzNC44MjQgOTkuMjgxMiAzNi42OTZIMTEwLjczN1pNMTI0LjYyOSA0OC4zMjRDEMTIzLjExNyA0OC4zMjQgMTIxLjc2MSA0OC4wNzIgMTIwLjU2MSA0Ny41NjhDMTE5LjM2MSA0Ny4wNCAxMTguNDEzIDQ2LjMyIDExNy43MTcgNDUuNDA4QzExNy4wMjEgNDQuNDcyIDExNi42MzcgNDMuNDA0IDExNi41NjUgNDIuMjA0SDEyMC4wNDlDMTIwLjE0NSA0My4xODggMTIwLjYwMSA0My45OTIgMTIxLjMxNyA0NC42MTZDMTIyLjE1NyA0NS4yNCAxMjMuMjQ5IDQ1LjU1MiAxMjQuNTkzIDQ1LjU1MkMxMjUuODQxIDQ1LjU1MiAxMjYuODI1IDQ1LjI3NiAxMjcuNTQ1IDQ0LjcyNEMxMjguMjY1IDQ0LjE3MiAxMjguNjI1IDQzLjQ3NiAxMjguNjI1IDQyLjYzNkMxMjguNjI1IDQxLjc3MiAxMjguMjQxIDQxLjEzNiAxMjcuNDczIDQwLjcyOEMxMjYuNzA1IDQwLjI5NiAxMjUuNTE3IDM5Ljg3NiAxMjMuOTA5IDM5LjQ2OEMxMjIuNDQ1IDM5LjA4NCAxMjEuMjQ1IDM4LjcgMTIwLjMwOSAzOC4zMTZDMTE5LjM5NyAzNy45MDggMTE4LjYwNSAzNy4zMiAxMTcuOTMzIDM2LjU1MkMxMTcuMjg1IDM1Ljc2IDExNi45NjEgMzQuNzI4IDExNi45NjEgMzMuNDU2QzExNi45NjEgMzIuNDQ4IDExNy4yNjEgMzEuNTI0IDExNy44NjEgMzAuNjg0QzExOC40NjEgMjkuODQ0IDExOS4zMTMgMjkuMTg0IDEyMC40MTcgMjguNzA0QzEyMS41MjEgMjguMiAxMjIuNzgxIDI3Ljk0OCAxMjQuMTk3IDI3Ljk0OEMxMjYuMzgxIDI3Ljk0OCAxMjguMTQ1IDI4LjUgMTI5LjQ4OSAyOS42MDRDMTMwLjgzMyAzMC43MDggMTMxLjU1MyAzMi4yMiAxMzEuNjQ5IDM0LjE0SDEyOC4zNzNDMTI4LjMwMSAzMy4xMDggMTI3Ljg4MSAzMi4yOCAxMjcuMTEzIDMxLjY1NkMxMjYuMzY5IDMxLjAzMiAxMjUuMzYxIDMwLjcyIDEyNC4wODkgMzAuNzJDMTIyLjkxMyAzMC43MiAxMjEuOTc3IDMwLjk3MiAxMjEuMjgxIDMxLjQ3NkMxMjAuNTg1IDMxLjk4IDEyMC4yMzcgMzIuNjQgMTIwLjIzNyAzMy40NTZDMTIwLjIzNyAzNC4xMDQgMTIwLjQ0MSAzNC42NDQgMTIwLjg0OSAzNS4wNzZDMTIxLjI4MSAzNS40ODQgMTIxLjgwOSAzNS44MiAxMjIuNDMzIDM2LjA4NEMxMjMuMDgxIDM2LjMyNCAxMjMuOTY5IDM2LjYgMTI1LjA5NyAzNi45MTJDMTI2LjUxMyAzNy4yOTYgMTI3LjY2NSAzNy42OCAxMjguNTUzIDM4LjA2NEMxMjkuNDQxIDM4LjQyNCAxMzAuMTk3IDM4Ljk3NiAxMzAuODIxIDM5LjcyQzEzMS40NjkgNDAuNDY0IDEzMS44MDUgNDEuNDM2IDEzMS44MjkgNDIuNjM2QzEzMS44MjkgNDMuNzE2IDEzMS41MjkgNDQuNjg4IDEzMC45MjkgNDUuNTUyQzEzMC4zMjkgNDYuNDE2IDEyOS40NzcgNDcuMSAxMjguMzczIDQ3LjYwNEMxMjcuMjkzIDQ4LjA4NCAxMjYuMDQ1IDQ4LjMyNCAxMjQuNjI5IDQ4LjMyNFpNMTM4LjY1IDMwLjk3MlY0Mi42QzEzOC42NSA0My41NiAxMzguODU0IDQ0LjI0NCAxMzkuMjYyIDQ0LjY1MkMxMzkuNjcwIDQ1LjAzNiAxNDAuMzc4IDQ1LjIyOCAxNDEuMzg2IDQ1LjIyOEgxNDMuNzk4VjQ4SDE0MC44NDZDMTM5LjAyMiA0OCAxMzcuNjU0IDQ3LjU4IDEzNi43NDIgNDYuNzRDMTM1LjgzIDQ1LjkgMTM1LjM3NCA0NC41MiAxMzUuMzc0IDQyLjZWNDIuNlYzMC45NzJIMTMyLjgxOFYyOC4yNzJIMTM1LjM3NFYyMy4zMDRIMTM4LjY1VjI4LjI3MkgxNDMuNzk4VjMwLjk3MkgxMzguNjVaIiBmaWxsPSIjNEE0QTRBIi8+PHBhdGggZD0iTTUzLjQyOTIgMTIuNzA3MkM0Mi42NTEzIDEwLjgyNyAzNy4yMTM5IDE3LjYyNDggMzIuMzEwNSAyMy4xNjM2TDM0LjAyMDQgMjQuOTI4N0wzNi4yMjg1IDIyLjQ3NjhDMzYuNjYxNiAyMi45MjgxIDM3LjEzNjggMjMuMzM4NSAzNy41MjY5IDIzLjUxNTJDNDkuNDQ3MiAyOC45MTQ4IDYxLjQwOTggOC44MTc0OCA2MS40MDk4IDguODE3NDhDNTkuMzAxMiAxMC44NjQyIDUxLjU4NzQgNy43NDUzMyA0NS42NTY3IDYuNTU5NzhDMzkuNzI1OSA1LjM3NDIzIDM1LjM4MDcgOS43ODQ5NyAzNC4zNTU4IDEyLjMyMjZDMzMuMzMwOSAxNC44NjAzIDM0LjMzMDUgMTcuOTM5NyAzNC4zMzA1IDE3LjkzOTdDNDIuNTkyNiA3Ljc5ODQ3IDUzLjQyOTIgMTIuNzA3MiA1My40MjkyIDEyLjcwNzJaIiBmaWxsPSIjMDA5OTY2Ii8+PC9nPjxkZWZzPjxjbGlwUGF0aCBpZD0iY2xpcDBfODZfOCI+PHJlY3Qgd2lkdGg9IjE1MiIgaGVpZ2h0PSI1MyIgZmlsbD0id2hpdGUiLz48L2NsaXBQYXRoPjwvZGVmcz48L3N2Zz4=';
          // Try to add SVG image - jsPDF supports SVG through addImage
          pdf.addImage(logoBase64, 'SVG', x, y, width, height);
          return height;
        } catch (error) {
          console.error('Error adding logo to PDF:', error);
          // If SVG fails, return 0 so layout still works
          return 0;
        }
      };

      // Header Section with Logo and Branding
      const headerHeight = 50;
      
      // Background with gradient effect (emerald tint)
      pdf.setDrawColor(16, 185, 129); // emerald-600 border
      pdf.setFillColor(240, 253, 244); // emerald-50 background
      pdf.roundedRect(margin, yPos, contentWidth, headerHeight, 4, 4, 'FD');
      
      // Add logo image (left side)
      const logoWidth = 60;
      const logoHeight = 21;
      const logoX = margin + 10;
      const logoY = yPos + (headerHeight - logoHeight) / 2;
      addLogoToPDF(pdf, logoX, logoY, logoWidth, logoHeight);
      
      // Document Title (Right side)
      pdf.setFontSize(18);
      pdf.setTextColor(17, 24, 39); // gray-900
      pdf.setFont(undefined, 'bold');
      const titleText = title;
      const titleWidth = pdf.getTextWidth(titleText);
      pdf.text(titleText, pageWidth - margin - 10 - titleWidth, yPos + 22);
      
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
      
      yPos = yPos + headerHeight + 15;

      // Parse HTML and convert to formatted PDF text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Function to process HTML elements recursively
      const processElement = (element) => {
        const tagName = element.tagName?.toLowerCase();
        const textContent = element.textContent?.trim() || '';
        
        if (!textContent && !tagName) return;
        
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin + 20;
        }
        
        // Handle different HTML elements
        if (tagName === 'h1' || tagName === 'h2') {
          yPos += 8; // Extra spacing before heading
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(16, 185, 129); // emerald-600
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(textContent, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 8;
          });
          yPos += 4; // Extra spacing after heading
        } else if (tagName === 'h3' || tagName === 'h4') {
          yPos += 6;
          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(17, 24, 39); // gray-900
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(textContent, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 7;
          });
          yPos += 3;
        } else if (tagName === 'p') {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(17, 24, 39); // gray-900
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(textContent, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 6;
          });
          yPos += 4; // Spacing after paragraph
        } else if (tagName === 'ul' || tagName === 'ol') {
          const listItems = Array.from(element.querySelectorAll('li'));
          listItems.forEach((li, idx) => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(17, 24, 39);
            const bullet = tagName === 'ul' ? '•' : `${idx + 1}.`;
            const itemText = li.textContent?.trim() || '';
            const maxWidth = contentWidth - 20; // Less width for bullet
            const lines = pdf.splitTextToSize(itemText, maxWidth);
            lines.forEach((line, lineIdx) => {
              if (yPos > pageHeight - 40) {
                pdf.addPage();
                yPos = margin + 20;
              }
              if (lineIdx === 0) {
                pdf.text(`${bullet} ${line}`, margin + 10, yPos);
              } else {
                pdf.text(`  ${line}`, margin + 10, yPos); // Indent wrapped lines
              }
              yPos += 6;
            });
            yPos += 2; // Small spacing between list items
          });
          yPos += 4; // Spacing after list
        } else if (tagName === 'li') {
          // Already handled in ul/ol
        } else if (tagName === 'strong' || tagName === 'b') {
          pdf.setFont(undefined, 'bold');
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(textContent, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 6;
          });
        } else if (textContent) {
          // Default: treat as paragraph
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(17, 24, 39);
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(textContent, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 6;
          });
          yPos += 4;
        }
      };
      
      // Process all child elements
      Array.from(tempDiv.children).forEach(child => {
        processElement(child);
      });
      
      // If no children, process as plain text
      if (tempDiv.children.length === 0) {
        const plainText = tempDiv.textContent?.trim() || '';
        if (plainText) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(17, 24, 39);
          const maxWidth = contentWidth - 4;
          const lines = pdf.splitTextToSize(plainText, maxWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = margin + 20;
            }
            pdf.text(line, margin + 10, yPos);
            yPos += 6;
          });
        }
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
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const filename = `zennest-${slug}-${Date.now()}.pdf`;
      pdf.save(filename);
      
      showToast('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleExportPDF = () => exportPDF(termsContent, 'Terms & Conditions');
  const handleExportPDFHouseRules = () => exportPDF(houseRulesContent, 'House Rules');

  const isEditing = activeTab === 'terms' ? editingTerms : editingHouseRules;
  const currentContent = activeTab === 'terms' ? termsContent : houseRulesContent;
  const isSaving = activeTab === 'terms' ? savingTerms : savingHouseRules;

  return (
    <motion.div
      key="terms"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Terms & Conditions / House Rules</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage HTML-formatted terms and house rules.</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('terms');
              setEditingTerms(false);
              setEditingHouseRules(false);
            }}
            className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'terms'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FaFileContract className="text-base sm:text-lg" />
            <span>Terms & Conditions</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('houseRules');
              setEditingTerms(false);
              setEditingHouseRules(false);
            }}
            className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'houseRules'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FaHome className="text-base sm:text-lg" />
            <span>House Rules</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <SectionHeader 
              icon={activeTab === 'terms' ? FaFileContract : FaHome} 
              title={activeTab === 'terms' ? 'Terms & Conditions Editor' : 'House Rules Editor'} 
            />
            {!isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={activeTab === 'terms' ? handlePrintTerms : handlePrintHouseRules}
                  disabled={!currentContent.trim()}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaPrint className="text-sm" />
                  <span className="hidden sm:inline">Print</span>
                  <span className="sm:hidden">Print</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={activeTab === 'terms' ? handleExportPDF : handleExportPDFHouseRules}
                  disabled={!currentContent.trim()}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaFilePdf className="text-sm" />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">PDF</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (activeTab === 'terms') {
                      setEditingTerms(true);
                    } else {
                      setEditingHouseRules(true);
                    }
                  }}
                  className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <FaEdit className="text-sm" />
                  <span className="hidden sm:inline">Edit {activeTab === 'terms' ? 'Terms' : 'House Rules'}</span>
                  <span className="sm:hidden">Edit</span>
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={activeTab === 'terms' ? handleSaveTerms : handleSaveHouseRules}
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">Saving</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="text-sm" />
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (activeTab === 'terms') {
                      setEditingTerms(false);
                      loadTerms();
                    } else {
                      setEditingHouseRules(false);
                      loadHouseRules();
                    }
                  }}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
                >
                  Cancel
                </motion.button>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">HTML Editing Enabled</p>
                <p>You can use HTML tags like <code className="bg-blue-100 px-1 rounded">&lt;h1&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;p&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;ul&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;strong&gt;</code>, etc.</p>
                <p className="mt-1">The formatted version will be displayed to users.</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading content...</p>
              </div>
            </div>
          ) : isEditing ? (
            /* HTML Editor Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  HTML Content (Edit Mode)
                </label>
                <textarea
                  value={currentContent}
                  onChange={(e) => {
                    if (activeTab === 'terms') {
                      setTermsContent(e.target.value);
                    } else {
                      setHouseRulesContent(e.target.value);
                    }
                  }}
                  className="w-full p-3 sm:p-4 border-2 border-emerald-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 font-mono text-xs sm:text-sm min-h-[300px] sm:min-h-[500px]"
                  placeholder={activeTab === 'terms' 
                    ? "<h1>Zennest Terms and Conditions</h1>&#10;<p>Welcome to Zennest...</p>&#10;<ul>&#10;  <li>Point 1</li>&#10;  <li>Point 2</li>&#10;</ul>"
                    : "<h1>House Rules</h1>&#10;<p>Please follow these house rules...</p>&#10;<ul>&#10;  <li>Rule 1</li>&#10;  <li>Rule 2</li>&#10;</ul>"
                  }
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Raw HTML is saved exactly as typed. No sanitization applied.
                </p>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Formatted Preview (How users will see it)
                </label>
                <div className="border-2 border-gray-200 rounded-lg p-3 sm:p-6 bg-gray-50 min-h-[300px] sm:min-h-[500px] overflow-auto">
                  {currentContent ? (
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentContent }}
                    />
                  ) : (
                    <p className="text-gray-400 italic">
                      No {activeTab === 'terms' ? 'terms' : 'house rules'} content available. Click "Edit {activeTab === 'terms' ? 'Terms' : 'House Rules'}" to add content.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TermsEditor;

