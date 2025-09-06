import jsPDF from 'jspdf';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

// Utility function to sanitize data for Firebase (remove undefined values)
function sanitizeForFirebase(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const sanitizedValue = sanitizeForFirebase(value);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
    }
    return sanitized;
  }
  
  return obj;
}

function capitalizeWords(str: string | undefined | null): string {
  if (!str) return 'Not specified';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

// Helper function to check if a field has meaningful data
function hasData(value: any): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

// Helper function to add a field conditionally to PDF
function addConditionalField(doc: jsPDF, label: string, value: any, margin: number, yPos: number, formatter?: (val: any) => string): number {
  if (!hasData(value)) return yPos;
  
  const displayValue = formatter ? formatter(value) : value;
  
  doc.setFont('helvetica', 'bold');
  doc.text(label, margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(displayValue, margin + 50, yPos);
  return yPos + 7;
}

// Helper function to format currency based on user preference
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CHF': 'CHF'
  };
  
  const symbol = currencySymbols[currency] || '$';
  return `${symbol}${amount.toLocaleString()}`;
}

// Helper function to get language-specific text
function getLocalizedText(key: string, language: string = 'english'): string {
  const translations: { [key: string]: { [lang: string]: string } } = {
    // Section Headers
    'project_info': {
      'english': 'Project Info',
      'spanish': 'Información del Proyecto',
      'french': 'Informations du Projet',
      'german': 'Projektinformationen',
      'italian': 'Informazioni del Progetto',
      'portuguese': 'Informações do Projeto',
      'chinese': '项目信息',
      'japanese': 'プロジェクト情報'
    },
    'structure_type': {
      'english': 'Structure Type',
      'spanish': 'Tipo de Estructura',
      'french': 'Type de Structure',
      'german': 'Strukturtyp',
      'italian': 'Tipo di Struttura',
      'portuguese': 'Tipo de Estrutura',
      'chinese': '结构类型',
      'japanese': '構造タイプ'
    },
    'roof_age': {
      'english': 'Roof Age',
      'spanish': 'Edad del Techo',
      'french': 'Âge du Toit',
      'german': 'Dachalter',
      'italian': 'Età del Tetto',
      'portuguese': 'Idade do Telhado',
      'chinese': '屋顶年龄',
      'japanese': '屋根の年齢'
    },
    'cost_estimates': {
      'english': 'COST ESTIMATES',
      'spanish': 'ESTIMACIONES DE COSTOS',
      'french': 'ESTIMATIONS DE COÛTS',
      'german': 'KOSTENSCHÄTZUNGEN',
      'italian': 'STIME DEI COSTI',
      'portuguese': 'ESTIMATIVAS DE CUSTOS',
      'chinese': '成本估算',
      'japanese': 'コスト見積もり'
    },
    'materials_cost': {
      'english': 'Materials Cost Breakdown:',
      'spanish': 'Desglose de Costos de Materiales:',
      'french': 'Répartition des Coûts de Matériaux:',
      'german': 'Materialkosten-Aufschlüsselung:',
      'italian': 'Ripartizione dei Costi dei Materiali:',
      'portuguese': 'Detalhamento dos Custos de Materiais:',
      'chinese': '材料成本明细:',
      'japanese': '材料費の内訳:'
    },
    'labor_cost': {
      'english': 'Labor Cost:',
      'spanish': 'Costo de Mano de Obra:',
      'french': 'Coût de la Main-d\'œuvre:',
      'german': 'Arbeitskosten:',
      'italian': 'Costo del Lavoro:',
      'portuguese': 'Custo da Mão de Obra:',
      'chinese': '人工成本:',
      'japanese': '人件費:'
    },
    'equipment_cost': {
      'english': 'Equipment Cost:',
      'spanish': 'Costo de Equipos:',
      'french': 'Coût de l\'Équipement:',
      'german': 'Ausrüstungskosten:',
      'italian': 'Costo dell\'Attrezzatura:',
      'portuguese': 'Custo do Equipamento:',
      'chinese': '设备成本:',
      'japanese': '設備費:'
    },
    'project_total': {
      'english': 'PROJECT TOTAL:',
      'spanish': 'TOTAL DEL PROYECTO:',
      'french': 'TOTAL DU PROJET:',
      'german': 'PROJEKTGESAMT:',
      'italian': 'TOTALE PROGETTO:',
      'portuguese': 'TOTAL DO PROJETO:',
      'chinese': '项目总计:',
      'japanese': 'プロジェクト合計:'
    },
    
    // Insurance Report Specific
    'claim_metadata': {
      'english': 'CLAIM METADATA',
      'spanish': 'METADATOS DE RECLAMO',
      'french': 'MÉTADONNÉES DE RÉCLAMATION',
      'german': 'ANSPRUCHS-METADATEN',
      'italian': 'METADATI DEL SINISTRO',
      'portuguese': 'METADADOS DA RECLAMAÇÃO',
      'chinese': '索赔元数据',
      'japanese': 'クレームメタデータ'
    },
    'claim_number': {
      'english': 'Claim Number:',
      'spanish': 'Número de Reclamo:',
      'french': 'Numéro de Réclamation:',
      'german': 'Anspruchsnummer:',
      'italian': 'Numero di Sinistro:',
      'portuguese': 'Número da Reclamação:',
      'chinese': '索赔编号:',
      'japanese': 'クレーム番号:'
    },
    'policyholder_name': {
      'english': 'Policyholder Name:',
      'spanish': 'Nombre del Asegurado:',
      'french': 'Nom de l\'Assuré:',
      'german': 'Versicherungsnehmer:',
      'italian': 'Nome dell\'Assicurato:',
      'portuguese': 'Nome do Segurado:',
      'chinese': '被保险人姓名:',
      'japanese': '被保険者名:'
    },
    'adjuster_name': {
      'english': 'Adjuster Name:',
      'spanish': 'Nombre del Ajustador:',
      'french': 'Nom de l\'Expert:',
      'german': 'Sachverständiger:',
      'italian': 'Nome del Perito:',
      'portuguese': 'Nome do Ajustador:',
      'chinese': '理算员姓名:',
      'japanese': '査定者名:'
    },
    'adjuster_contact': {
      'english': 'Adjuster Contact:',
      'spanish': 'Contacto del Ajustador:',
      'french': 'Contact de l\'Expert:',
      'german': 'Kontakt Sachverständiger:',
      'italian': 'Contatto del Perito:',
      'portuguese': 'Contato do Ajustador:',
      'chinese': '理算员联系方式:',
      'japanese': '査定者連絡先:'
    },
    'date_of_loss': {
      'english': 'Date of Loss:',
      'spanish': 'Fecha de Pérdida:',
      'french': 'Date de Perte:',
      'german': 'Schadensdatum:',
      'italian': 'Data del Danno:',
      'portuguese': 'Data da Perda:',
      'chinese': '损失日期:',
      'japanese': '損害発生日:'
    },
    'damage_cause': {
      'english': 'Damage Cause:',
      'spanish': 'Causa del Daño:',
      'french': 'Cause du Dommage:',
      'german': 'Schadensursache:',
      'italian': 'Causa del Danno:',
      'portuguese': 'Causa do Dano:',
      'chinese': '损害原因:',
      'japanese': '損害原因:'
    },
    'inspection_summary': {
      'english': 'INSPECTION SUMMARY',
      'spanish': 'RESUMEN DE INSPECCIÓN',
      'french': 'RÉSUMÉ D\'INSPECTION',
      'german': 'INSPEKTIONSZUSAMMENFASSUNG',
      'italian': 'RIEPILOGO ISPEZIONE',
      'portuguese': 'RESUMO DA INSPEÇÃO',
      'chinese': '检查摘要',
      'japanese': '検査サマリー'
    },
    'claim_types_handled': {
      'english': 'CLAIM TYPES HANDLED',
      'spanish': 'TIPOS DE RECLAMOS MANEJADOS',
      'french': 'TYPES DE RÉCLAMATIONS TRAITÉES',
      'german': 'BEHANDELTE ANSPRUCHSTYPEN',
      'italian': 'TIPI DI SINISTRI GESTITI',
      'portuguese': 'TIPOS DE RECLAMAÇÕES TRATADAS',
      'chinese': '处理的索赔类型',
      'japanese': '取り扱いクレームタイプ'
    },
    
    // Common Labels
    'rate_per_hour': {
      'english': 'Rate per Hour:',
      'spanish': 'Tarifa por Hora:',
      'french': 'Taux par Heure:',
      'german': 'Stundensatz:',
      'italian': 'Tariffa Oraria:',
      'portuguese': 'Taxa por Hora:',
      'chinese': '每小时费率:',
      'japanese': '時給:'
    },
    'total_hours': {
      'english': 'Total Hours:',
      'spanish': 'Horas Totales:',
      'french': 'Heures Totales:',
      'german': 'Gesamtstunden:',
      'italian': 'Ore Totali:',
      'portuguese': 'Horas Totais:',
      'chinese': '总小时数:',
      'japanese': '総時間:'
    },
    'total_materials_cost': {
      'english': 'Total Materials Cost:',
      'spanish': 'Costo Total de Materiales:',
      'french': 'Coût Total des Matériaux:',
      'german': 'Gesamtmaterialkosten:',
      'italian': 'Costo Totale Materiali:',
      'portuguese': 'Custo Total de Materiais:',
      'chinese': '材料总成本:',
      'japanese': '材料費合計:'
    },
    'total_labor_cost': {
      'english': 'Total Labor Cost:',
      'spanish': 'Costo Total de Mano de Obra:',
      'french': 'Coût Total de la Main-d\'œuvre:',
      'german': 'Gesamtarbeitskosten:',
      'italian': 'Costo Totale del Lavoro:',
      'portuguese': 'Custo Total da Mão de Obra:',
      'chinese': '人工总成本:',
      'japanese': '人件費合計:'
    },
    'total_equipment_cost': {
      'english': 'Total Equipment Cost:',
      'spanish': 'Costo Total de Equipos:',
      'french': 'Coût Total de l\'Équipement:',
      'german': 'Gesamtausrüstungskosten:',
      'italian': 'Costo Totale Attrezzatura:',
      'portuguese': 'Custo Total do Equipamento:',
      'chinese': '设备总成本:',
      'japanese': '設備費合計:'
    },
    
    // Homeowner Report Specific
    'budget_guidance': {
      'english': 'BUDGET GUIDANCE',
      'spanish': 'ORIENTACIÓN PRESUPUESTARIA',
      'french': 'CONSEILS BUDGÉTAIRES',
      'german': 'BUDGETBERATUNG',
      'italian': 'CONSIGLI BUDGET',
      'portuguese': 'ORIENTAÇÃO ORÇAMENTÁRIA',
      'chinese': '预算指导',
      'japanese': '予算ガイダンス'
    },
    'estimated_range': {
      'english': 'Estimated Range:',
      'spanish': 'Rango Estimado:',
      'french': 'Gamme Estimée:',
      'german': 'Geschätzter Bereich:',
      'italian': 'Gamma Stimata:',
      'portuguese': 'Faixa Estimada:',
      'chinese': '估算范围:',
      'japanese': '見積もり範囲:'
    },
    'repairs': {
      'english': 'Repairs:',
      'spanish': 'Reparaciones:',
      'french': 'Réparations:',
      'german': 'Reparaturen:',
      'italian': 'Riparazioni:',
      'portuguese': 'Reparos:',
      'chinese': '维修:',
      'japanese': '修理:'
    },
    'partial_replacement': {
      'english': 'Partial Replacement:',
      'spanish': 'Reemplazo Parcial:',
      'french': 'Remplacement Partiel:',
      'german': 'Teilerneuerung:',
      'italian': 'Sostituzione Parziale:',
      'portuguese': 'Substituição Parcial:',
      'chinese': '部分更换:',
      'japanese': '部分交換:'
    },
    'full_replacement': {
      'english': 'Full Replacement:',
      'spanish': 'Reemplazo Completo:',
      'french': 'Remplacement Complet:',
      'german': 'Vollständige Erneuerung:',
      'italian': 'Sostituzione Completa:',
      'portuguese': 'Substituição Completa:',
      'chinese': '完全更换:',
      'japanese': '完全交換:'
    },
    'financing_options': {
      'english': 'Financing Options:',
      'spanish': 'Opciones de Financiamiento:',
      'french': 'Options de Financement:',
      'german': 'Finanzierungsoptionen:',
      'italian': 'Opzioni di Finanziamento:',
      'portuguese': 'Opções de Financiamento:',
      'chinese': '融资选择:',
      'japanese': '資金調達オプション:'
    },
    'home_improvement_loans': {
      'english': 'Home improvement loans',
      'spanish': 'Préstamos para mejoras del hogar',
      'french': 'Prêts d\'amélioration de l\'habitat',
      'german': 'Modernisierungsdarlehen',
      'italian': 'Prestiti per miglioramenti domestici',
      'portuguese': 'Empréstimos para melhorias domésticas',
      'chinese': '房屋改善贷款',
      'japanese': '住宅改善ローン'
    },
    'insurance_claims': {
      'english': 'Insurance claims (if applicable)',
      'spanish': 'Reclamos de seguros (si aplica)',
      'french': 'Réclamations d\'assurance (si applicable)',
      'german': 'Versicherungsansprüche (falls zutreffend)',
      'italian': 'Reclami assicurativi (se applicabile)',
      'portuguese': 'Reclamações de seguro (se aplicável)',
      'chinese': '保险索赔（如适用）',
      'japanese': '保険請求（該当する場合）'
    },
    'contractor_payment_plans': {
      'english': 'Contractor payment plans',
      'spanish': 'Planes de pago del contratista',
      'french': 'Plans de paiement du contractant',
      'german': 'Zahlungspläne des Auftragnehmers',
      'italian': 'Piani di pagamento del contraente',
      'portuguese': 'Planos de pagamento do contratante',
      'chinese': '承包商付款计划',
      'japanese': '請負業者支払いプラン'
    },
    'home_equity_line': {
      'english': 'Home equity line of credit',
      'spanish': 'Línea de crédito con garantía hipotecaria',
      'french': 'Ligne de crédit sur valeur domiciliaire',
      'german': 'Eigenheimkreditlinie',
      'italian': 'Linea di credito su valore della casa',
      'portuguese': 'Linha de crédito com garantia imobiliária',
      'chinese': '房屋净值信贷额度',
      'japanese': 'ホームエクイティローン'
    },
    
    // Contractor Report Specific
    'contractor_project_report': {
      'english': 'CONTRACTOR PROJECT REPORT',
      'spanish': 'INFORME DE PROYECTO DEL CONTRATISTA',
      'french': 'RAPPORT DE PROJET DU CONTRACTANT',
      'german': 'AUSSCHREIBUNGSBERICHT',
      'italian': 'RAPPORTO PROGETTO APPALTATORE',
      'portuguese': 'RELATÓRIO DO PROJETO DO CONTRATANTE',
      'chinese': '承包商项目报告',
      'japanese': '請負業者プロジェクトレポート'
    },
    'project_details': {
      'english': 'PROJECT DETAILS',
      'spanish': 'DETALLES DEL PROYECTO',
      'french': 'DÉTAILS DU PROJET',
      'german': 'PROJEKTDETAILS',
      'italian': 'DETTAGLI DEL PROGETTO',
      'portuguese': 'DETALHES DO PROJETO',
      'chinese': '项目详情',
      'japanese': 'プロジェクト詳細'
    },
    'project_address': {
      'english': 'Project Address:',
      'spanish': 'Dirección del Proyecto:',
      'french': 'Adresse du Projet:',
      'german': 'Projektadresse:',
      'italian': 'Indirizzo del Progetto:',
      'portuguese': 'Endereço do Projeto:',
      'chinese': '项目地址:',
      'japanese': 'プロジェクト住所:'
    },
    'project_type': {
      'english': 'Project Type:',
      'spanish': 'Tipo de Proyecto:',
      'french': 'Type de Projet:',
      'german': 'Projekttyp:',
      'italian': 'Tipo di Progetto:',
      'portuguese': 'Tipo de Projeto:',
      'chinese': '项目类型:',
      'japanese': 'プロジェクトタイプ:'
    },
    'job_type': {
      'english': 'Job Type:',
      'spanish': 'Tipo de Trabajo:',
      'french': 'Type de Travail:',
      'german': 'Auftragstyp:',
      'italian': 'Tipo di Lavoro:',
      'portuguese': 'Tipo de Trabalho:',
      'chinese': '工作类型:',
      'japanese': '作業タイプ:'
    },
    'material_preference': {
      'english': 'Material Preference:',
      'spanish': 'Preferencia de Material:',
      'french': 'Préférence de Matériau:',
      'german': 'Materialpräferenz:',
      'italian': 'Preferenza Materiale:',
      'portuguese': 'Preferência de Material:',
      'chinese': '材料偏好:',
      'japanese': '材料の好み:'
    },
    'total_area': {
      'english': 'Total Area:',
      'spanish': 'Área Total:',
      'french': 'Superficie Totale:',
      'german': 'Gesamtfläche:',
      'italian': 'Area Totale:',
      'portuguese': 'Área Total:',
      'chinese': '总面积:',
      'japanese': '総面積:'
    },
    'roof_pitch': {
      'english': 'Roof Pitch:',
      'spanish': 'Pendiente del Techo:',
      'french': 'Pente du Toit:',
      'german': 'Dachneigung:',
      'italian': 'Pendenza del Tetto:',
      'portuguese': 'Inclinação do Telhado:',
      'chinese': '屋顶坡度:',
      'japanese': '屋根の勾配:'
    },
    'existing_materials': {
      'english': 'Existing Materials:',
      'spanish': 'Materiales Existentes:',
      'french': 'Matériaux Existants:',
      'german': 'Vorhandene Materialien:',
      'italian': 'Materiali Esistenti:',
      'portuguese': 'Materiais Existentes:',
      'chinese': '现有材料:',
      'japanese': '既存材料:'
    },
    'local_permit_required': {
      'english': 'Local Permit Required:',
      'spanish': 'Permiso Local Requerido:',
      'french': 'Permis Local Requis:',
      'german': 'Lokale Genehmigung Erforderlich:',
      'italian': 'Permesso Locale Richiesto:',
      'portuguese': 'Permissão Local Necessária:',
      'chinese': '需要当地许可:',
      'japanese': '地元許可が必要:'
    },
    'scope_of_work': {
      'english': 'SCOPE OF WORK',
      'spanish': 'ALCANCE DEL TRABAJO',
      'french': 'PORTÉE DU TRAVAIL',
      'german': 'ARBEITSUMFANG',
      'italian': 'AMBITO DEL LAVORO',
      'portuguese': 'ESCOPO DO TRABALHO',
      'chinese': '工作范围',
      'japanese': '作業範囲'
    },
    'preparation_tasks': {
      'english': 'Preparation Tasks:',
      'spanish': 'Tareas de Preparación:',
      'french': 'Tâches de Préparation:',
      'german': 'Vorbereitungsaufgaben:',
      'italian': 'Compiti di Preparazione:',
      'portuguese': 'Tarefas de Preparação:',
      'chinese': '准备工作:',
      'japanese': '準備作業:'
    },
    'removal_tasks': {
      'english': 'Removal Tasks:',
      'spanish': 'Tareas de Remoción:',
      'french': 'Tâches de Suppression:',
      'german': 'Entfernungsaufgaben:',
      'italian': 'Compiti di Rimozione:',
      'portuguese': 'Tarefas de Remoção:',
      'chinese': '拆除工作:',
      'japanese': '撤去作業:'
    },
    'installation_tasks': {
      'english': 'Installation Tasks:',
      'spanish': 'Tareas de Instalación:',
      'french': 'Tâches d\'Installation:',
      'german': 'Installationsaufgaben:',
      'italian': 'Compiti di Installazione:',
      'portuguese': 'Tarefas de Instalação:',
      'chinese': '安装工作:',
      'japanese': '設置作業:'
    },
    'finishing_tasks': {
      'english': 'Finishing Tasks:',
      'spanish': 'Tareas de Acabado:',
      'french': 'Tâches de Finition:',
      'german': 'Abschlussaufgaben:',
      'italian': 'Compiti di Finitura:',
      'portuguese': 'Tarefas de Acabamento:',
      'chinese': '收尾工作:',
      'japanese': '仕上げ作業:'
    },
    'labor_equipment': {
      'english': 'LABOR & EQUIPMENT',
      'spanish': 'MANO DE OBRA Y EQUIPOS',
      'french': 'MAIN-D\'ŒUVRE ET ÉQUIPEMENT',
      'german': 'ARBEITSKRAFT & AUSRÜSTUNG',
      'italian': 'MANODOPERA E ATTREZZATURE',
      'portuguese': 'MÃO DE OBRA E EQUIPAMENTOS',
      'chinese': '人工和设备',
      'japanese': '労働力と設備'
    },
    'crew_size': {
      'english': 'Crew Size:',
      'spanish': 'Tamaño de la Tripulación:',
      'french': 'Taille de l\'Équipe:',
      'german': 'Mannschaftsgröße:',
      'italian': 'Dimensione della Squadra:',
      'portuguese': 'Tamanho da Equipe:',
      'chinese': '团队规模:',
      'japanese': 'クルーサイズ:'
    },
    'estimated_days': {
      'english': 'Estimated Days:',
      'spanish': 'Días Estimados:',
      'french': 'Jours Estimés:',
      'german': 'Geschätzte Tage:',
      'italian': 'Giorni Stimati:',
      'portuguese': 'Dias Estimados:',
      'chinese': '预计天数:',
      'japanese': '見積もり日数:'
    },
    'steep_assist': {
      'english': 'Steep Assist:',
      'spanish': 'Asistencia en Pendientes:',
      'french': 'Assistance Raide:',
      'german': 'Steile Unterstützung:',
      'italian': 'Assistenza Ripida:',
      'portuguese': 'Assistência Íngreme:',
      'chinese': '陡坡辅助:',
      'japanese': '急勾配サポート:'
    },
    'special_equipment': {
      'english': 'Special Equipment:',
      'spanish': 'Equipos Especiales:',
      'french': 'Équipement Spécial:',
      'german': 'Spezialausrüstung:',
      'italian': 'Attrezzature Speciali:',
      'portuguese': 'Equipamentos Especiais:',
      'chinese': '特殊设备:',
      'japanese': '特殊機器:'
    },
    'safety_requirements': {
      'english': 'Safety Requirements:',
      'spanish': 'Requisitos de Seguridad:',
      'french': 'Exigences de Sécurité:',
      'german': 'Sicherheitsanforderungen:',
      'italian': 'Requisiti di Sicurezza:',
      'portuguese': 'Requisitos de Segurança:',
      'chinese': '安全要求:',
      'japanese': '安全要件:'
    },
    'material_breakdown': {
      'english': 'MATERIAL BREAKDOWN',
      'spanish': 'DESGLOSE DE MATERIALES',
      'french': 'RÉPARTITION DES MATÉRIAUX',
      'german': 'MATERIALAUFSCHLÜSSELUNG',
      'italian': 'RIPARTIZIONE MATERIALI',
      'portuguese': 'DETALHAMENTO DE MATERIAIS',
      'chinese': '材料明细',
      'japanese': '材料内訳'
    },
    'item': {
      'english': 'Item',
      'spanish': 'Artículo',
      'french': 'Article',
      'german': 'Artikel',
      'italian': 'Articolo',
      'portuguese': 'Item',
      'chinese': '项目',
      'japanese': '項目'
    },
    'qty': {
      'english': 'Qty',
      'spanish': 'Cant',
      'french': 'Qté',
      'german': 'Anz',
      'italian': 'Qtà',
      'portuguese': 'Qtd',
      'chinese': '数量',
      'japanese': '数量'
    },
    'unit': {
      'english': 'Unit',
      'spanish': 'Unidad',
      'french': 'Unité',
      'german': 'Einheit',
      'italian': 'Unità',
      'portuguese': 'Unidade',
      'chinese': '单位',
      'japanese': '単位'
    },
    'notes': {
      'english': 'Notes',
      'spanish': 'Notas',
      'french': 'Notes',
      'german': 'Notizen',
      'italian': 'Note',
      'portuguese': 'Notas',
      'chinese': '备注',
      'japanese': '備考'
    },
    'project_image': {
      'english': 'Project Image',
      'spanish': 'Imagen del Proyecto',
      'french': 'Image du Projet',
      'german': 'Projektbild',
      'italian': 'Immagine del Progetto',
      'portuguese': 'Imagem do Projeto',
      'chinese': '项目图片',
      'japanese': 'プロジェクト画像'
    },
    'repair_analysis': {
      'english': 'Repair Analysis',
      'spanish': 'Análisis de Reparación',
      'french': 'Analyse de Réparation',
      'german': 'Reparaturanalyse',
      'italian': 'Analisi di Riparazione',
      'portuguese': 'Análise de Reparo',
      'chinese': '维修分析',
      'japanese': '修理分析'
    },
    'contractor_analysis': {
      'english': 'Contractor Analysis & Repair Indicators:',
      'spanish': 'Análisis del Contratista e Indicadores de Reparación:',
      'french': 'Analyse du Contractant et Indicateurs de Réparation:',
      'german': 'Auftragnehmer-Analyse und Reparaturindikatoren:',
      'italian': 'Analisi del Contraente e Indicatori di Riparazione:',
      'portuguese': 'Análise do Contratante e Indicadores de Reparo:',
      'chinese': '承包商分析和维修指标:',
      'japanese': '請負業者分析と修理指標:'
    }
  };
  
  return translations[key]?.[language] || translations[key]?.['english'] || key;
}

function addInsuranceReport(doc: jsPDF, project: any, estimate: any) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPos = 20;
  
  // Get user preferences
  const preferredLanguage = project.preferredLanguage || 'english';
  const preferredCurrency = project.preferredCurrency || 'USD';
  
  // Debug logging
  console.log('=== Insurance Report Data ===');
  console.log('Project:', project);
  console.log('Estimate:', estimate);
  console.log('Report:', estimate?.report);
  console.log('Language:', preferredLanguage, 'Currency:', preferredCurrency);
  
  // Extract report data - handle both direct form data and Gemini response
  const report = estimate?.report || {};
  const claimMetadata = report.claimMetadata || {
    claimNumber: project.claimNumber || 'Not provided',
    policyholder: project.policyholderName || 'Not provided',
    adjusterName: project.insuranceAdjusterInfo?.companyName || project.adjusterName || 'Not provided',
    adjusterContact: project.insuranceAdjusterInfo?.adjusterId || project.adjusterContact || 'Not provided',
    dateOfLoss: project.dateOfLoss || 'Not provided',
    dateOfInspection: new Date().toLocaleDateString()
  };
  
  const inspectionSummary = report.inspectionSummary || {
    propertyAddress: `${project.location?.city || ''}, ${project.location?.country || ''} ${project.location?.zipCode || ''}`,
    structureType: project.structureType,
    roofAge: `${project.roofAge} years`,
    roofPitch: project.roofPitch,
    existingMaterials: project.materialLayers?.join(', '),
    totalArea: `${project.area || 'Not specified'} sq ft`,
    weatherConditions: project.weatherConditions
  };
  
  const coverageTable = report.coverageTable || {
    coveredItems: project.coverageMapping?.covered || [],
    nonCoveredItems: project.coverageMapping?.excluded || [],
    maintenanceItems: project.coverageMapping?.maintenance || []
  };
  
  const stormDamageAssessment = report.stormDamageAssessment || {
    primaryDamageCause: project.damageCause,
    affectedComponents: project.materialLayers,
    damageExtent: project.slopeDamage
  };
  
  const damageClassifications = report.damageClassificationsTable || project.slopeDamage || [];
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text('INSURANCE CLAIM REPORT', pageWidth/2, yPos, { align: 'center' });
  yPos += 15;

  // Claim Metadata Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text(getLocalizedText('claim_metadata', preferredLanguage), margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  // Add metadata fields conditionally
  yPos = addConditionalField(doc, getLocalizedText('claim_number', preferredLanguage), claimMetadata.claimNumber, margin, yPos);
  yPos = addConditionalField(doc, getLocalizedText('policyholder_name', preferredLanguage), claimMetadata.policyholder, margin, yPos);
  yPos = addConditionalField(doc, getLocalizedText('adjuster_name', preferredLanguage), claimMetadata.adjusterName, margin, yPos);
  yPos = addConditionalField(doc, getLocalizedText('adjuster_contact', preferredLanguage), claimMetadata.adjusterContact, margin, yPos);
  yPos = addConditionalField(doc, 'Jurisdiction:', project.insuranceAdjusterInfo?.jurisdiction, margin, yPos);
  yPos = addConditionalField(doc, getLocalizedText('date_of_loss', preferredLanguage), project.dateOfLoss, margin, yPos);
  yPos = addConditionalField(doc, getLocalizedText('damage_cause', preferredLanguage), project.damageCause, margin, yPos);
  yPos = addConditionalField(doc, 'Date of Inspection:', claimMetadata.dateOfInspection || new Date().toLocaleDateString(), margin, yPos);
  yPos += 5;

  // Inspection Summary Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text(getLocalizedText('inspection_summary', preferredLanguage), margin + 5, yPos + 6);
  yPos += 15;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Add inspection summary fields conditionally
  const propertyAddress = inspectionSummary.propertyAddress || 
    (project.location?.city ? `${project.location.city}, ${project.location.country || ''} ${project.location.zipCode || ''}`.trim() : null);
  yPos = addConditionalField(doc, 'Property Address:', propertyAddress, margin, yPos);
  yPos = addConditionalField(doc, 'Structure Type:', inspectionSummary.structureType || project.structureType, margin, yPos);
  yPos = addConditionalField(doc, 'Roof Age:', inspectionSummary.roofAge || (project.roofAge ? `${project.roofAge} years` : null), margin, yPos);
  yPos = addConditionalField(doc, 'Roof Pitch:', inspectionSummary.roofPitch || project.roofPitch, margin, yPos);
  yPos = addConditionalField(doc, 'Existing Materials:', inspectionSummary.existingMaterials || project.materialLayers?.join(', '), margin, yPos);
  yPos = addConditionalField(doc, 'Total Area:', inspectionSummary.totalArea || (project.area ? `${project.area} sq ft` : null), margin, yPos);
  yPos = addConditionalField(doc, 'Weather Conditions:', inspectionSummary.weatherConditions || project.weatherConditions, margin, yPos);
  yPos += 5;

  // Claim Types Handled Section
  if (project.insuranceAdjusterInfo?.claimTypesHandled && project.insuranceAdjusterInfo.claimTypesHandled.length > 0) {
    doc.setFillColor(255, 102, 0);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.text('CLAIM TYPES HANDLED', margin + 5, yPos + 6);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    project.insuranceAdjusterInfo.claimTypesHandled.forEach((claimType: string) => {
      doc.text(`• ${claimType}`, margin + 10, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Coverage Table Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('COVERAGE ANALYSIS', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Covered Items
  doc.setFont('helvetica', 'bold');
  doc.text('Covered Items:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const coveredItems = coverageTable.coveredItems || project.coverageMapping?.covered || [];
  if (coveredItems.length > 0) {
    coveredItems.forEach((item: string) => {
      doc.text(`• ${item}`, margin + 10, yPos);
      yPos += 5;
    });
  } else {
    doc.text('No covered items specified', margin + 10, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Non-Covered Items
  doc.setFont('helvetica', 'bold');
  doc.text('Non-Covered Items:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const nonCoveredItems = coverageTable.nonCoveredItems || project.coverageMapping?.excluded || [];
  if (nonCoveredItems.length > 0) {
    nonCoveredItems.forEach((item: string) => {
      doc.text(`• ${item}`, margin + 10, yPos);
      yPos += 5;
    });
  } else {
    doc.text('No non-covered items specified', margin + 10, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Add new page for Storm Damage Assessment
  doc.addPage();
  yPos = 20;

  // Storm Damage Assessment Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('STORM DAMAGE ASSESSMENT', margin + 5, yPos + 6);
  yPos += 15;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
    
    doc.setFont('helvetica', 'bold');
  doc.text('Primary Damage Cause:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(stormDamageAssessment.primaryDamageCause || project.damageCause || 'Not provided', margin + 50, yPos);
  yPos += 10;

  // Affected Components
  doc.setFont('helvetica', 'bold');
  doc.text('Affected Components:', margin, yPos);
  yPos += 7;
    doc.setFont('helvetica', 'normal');
  const affectedComponents = stormDamageAssessment.affectedComponents || project.materialLayers || [];
  if (affectedComponents.length > 0) {
    affectedComponents.forEach((component: string) => {
      doc.text(`• ${component}`, margin + 10, yPos);
      yPos += 5;
    });
  } else {
    doc.text('No affected components specified', margin + 10, yPos);
    yPos += 5;
  }
  yPos += 10;

  // Only add Damage Classifications section if there is actual damage data
  const slopeDamageData = damageClassifications || project.slopeDamage || [];
  const validDamageData = slopeDamageData.filter((damage: any) => 
    damage.slope && 
    damage.damageType && 
    damage.severity && 
    damage.description &&
    damage.slope !== 'Not specified' &&
    damage.damageType !== 'Not specified' &&
    damage.severity !== 'Not specified' &&
    damage.description !== 'Not provided'
  );

  if (validDamageData.length > 0) {
    // Damage Classifications Section
    doc.setFillColor(255, 102, 0);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.text('DAMAGE CLASSIFICATIONS', margin + 5, yPos + 6);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    validDamageData.forEach((damage: any, index: number) => {
      // Slope Header
    doc.setFont('helvetica', 'bold');
      doc.text(`Slope: ${damage.slope}`, margin, yPos);
      yPos += 7;
    
      // Damage Details
    doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${capitalizeWords(damage.damageType)}`, margin + 10, yPos);
      yPos += 5;
      doc.text(`Severity: ${capitalizeWords(damage.severity)}`, margin + 10, yPos);
      yPos += 5;
      doc.text(`Description: ${damage.description}`, margin + 10, yPos);
      yPos += 10;

      // Add spacing between slopes
      if (index < validDamageData.length - 1) {
        yPos += 5;
      }

      // Check if we need a new page
      if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
      }
    });
  }

  // Legal/Certification Notes
  yPos += 10;
  doc.setFillColor(33, 53, 153);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('LEGAL CERTIFICATION', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const legalNotes = report.legalCertificationNotes || {};
    
    doc.setFont('helvetica', 'normal');
  const certificationText = legalNotes.certificationStatement || 
    `This report is prepared for insurance purposes by ${project.adjusterName || 'assigned adjuster'}, based on physical inspection and documentation review of the ${project.structureType} property located in ${project.location?.city || 'specified location'}.`;
  
  doc.text(certificationText, margin, yPos, {
    maxWidth: pageWidth - 2*margin
  });
}

function addInsuranceImagePages(doc: jsPDF, uploadedFiles: any[], report?: any) {
  // Get annotations from the report
  let annotations: string[] = [];
  if (report && report.annotatedPhotos) {
    annotations = report.annotatedPhotos;
  }
  
  uploadedFiles.forEach((imageFile, index) => {
    doc.addPage();
    
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(255, 102, 0);
  } else {
    doc.setTextColor(255, 102, 0);
  }
  doc.setFontSize(48);
  doc.text('FLACRONBUILD', 105, 148, { angle: 35, align: 'center' });
  doc.restoreGraphicsState && doc.restoreGraphicsState();
  
  let y = 20;
    
    // Page title
    doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
    doc.text(`CLAIM EVIDENCE ${index + 1}`, 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  doc.setDrawColor(255, 102, 0);
  doc.setLineWidth(1);
  doc.line(20, y, 190, y);
    y += 15;
    
    // Image annotation with insurance-specific focus
    doc.setFontSize(11);
    const annotation = annotations[index] || 'Insurance claim documentation photo - analysis pending';
    const annotationLines = doc.splitTextToSize(annotation, 150);
    annotationLines.forEach((line: string) => {
      doc.text(line, 20, y);
      y += 6;
    });
    y += 10;
    
    // Add the actual image
    if (imageFile && imageFile.data) {
      try {
        const imgWidth = 150;
        const imgHeight = 100;
        doc.addImage(imageFile.data, 'JPEG', 20, y, imgWidth, imgHeight);
        y += imgHeight + 10;
        
        // Image details with insurance context
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Documentation: ${imageFile.name || 'Claim Photo'}`, 20, y);
  y += 4;
        doc.text(`File Reference: ${Math.round(imageFile.size / 1024)} KB`, 20, y);
        y += 4;
        doc.text('For Insurance Documentation Purposes Only', 20, y);
      } catch (error) {
        console.error('Error adding image to PDF:', error);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, y, 150, 100);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('[Image could not be loaded]', 25, y + 50);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.rect(20, y, 150, 100);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('[No image available]', 25, y + 50);
    }
  });
}

interface MaterialItem {
  item: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface CostBreakdownItem {
  category: string;
  amount: number;
}

interface EquipmentItem {
  item: string;
  cost: number;
}

interface ContractorReport {
  projectDetails: {
    address: string;
    type: string;
    dimensions?: {
      totalArea?: number;
      pitch?: string;
      slopes?: number;
    };
  };
  scopeOfWork: {
    preparationTasks: string[];
    removalTasks: string[];
    installationTasks: string[];
    finishingTasks: string[];
  };
  laborRequirements: {
    crewSize?: string | number;
    estimatedDays?: number;
    specialEquipment: string[];
    safetyRequirements: string[];
  };
  materialBreakdown?: {
    lineItems: MaterialItem[];
  };
  costEstimates: {
    materials: {
      total: number;
      breakdown: CostBreakdownItem[];
    };
    labor: {
      total: number;
      ratePerHour: number;
      totalHours: number;
    };
    equipment: {
      total: number;
      items: EquipmentItem[];
    };
  };
}

function addContractorReport(doc: jsPDF, project: any, estimate: any) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPos = 20;

  // Get user preferences
  const preferredLanguage = project.preferredLanguage || 'english';
  const preferredCurrency = project.preferredCurrency || 'USD';

  // Debug logging
  console.log('=== Contractor Report Data ===');
  console.log('Project:', project);
  console.log('Estimate:', estimate);
  console.log('Report:', estimate?.report);
  console.log('Language:', preferredLanguage, 'Currency:', preferredCurrency);

  // Extract report data with fallbacks to form data
  const report = (estimate?.report || {}) as ContractorReport;
  
  // Use form data as primary source, Gemini data as enhancement
  const projectDetails = {
    address: `${project.location?.city || ''}, ${project.location?.country || ''} ${project.location?.zipCode || ''}`.trim() || 'Not specified',
    type: project.projectType || 'Not specified',
    dimensions: {
      totalArea: project.area || report.projectDetails?.dimensions?.totalArea,
      pitch: project.roofPitch || 'Not specified',
      slopes: project.slopeDamage?.length || 1
    }
  };

  // Use Gemini scope of work if available, otherwise create from form data
  const scopeOfWork = report.scopeOfWork || {
    preparationTasks: [
      'Site assessment and safety setup',
      'Material delivery and staging',
      project.localPermit ? 'Obtain required local permits' : 'Permits if needed',
      'Weather monitoring and scheduling'
    ],
    removalTasks: [
      project.jobType === 'full-replace' ? 'Complete removal of existing roofing materials' : 'Partial removal of damaged sections',
      'Debris removal and disposal',
      'Deck inspection and repair preparation'
    ],
    installationTasks: [
      ...(project.lineItems?.includes('Underlayment & Felt') ? [`Install ${project.felt || '15lb'} felt underlayment`] : []),
      ...(project.iceWaterShield ? ['Install ice and water shield'] : []),
      ...(project.dripEdge ? ['Install drip edge and trim'] : []),
      `Install ${project.materialLayers?.[0] || 'roofing materials'}`,
      ...(project.lineItems?.includes('Ridge Vents & Ventilation') ? ['Install ridge vents and ventilation'] : []),
      ...(project.lineItems?.includes('Flashing (All Types)') ? ['Install flashing systems'] : []),
      'Final inspection and quality control'
    ],
    finishingTasks: [
      'Site cleanup and debris removal',
      'Final walkthrough with client',
      'Warranty documentation'
    ]
  };

  // Use form data for labor requirements with Gemini enhancements
  const laborRequirements = {
    crewSize: project.laborNeeds?.workerCount || report.laborRequirements?.crewSize || '3-5',
    estimatedDays: report.laborRequirements?.estimatedDays || (project.jobType === 'full-replace' ? '5-8' : '2-4'),
    specialEquipment: report.laborRequirements?.specialEquipment || [
      ...(project.laborNeeds?.steepAssist ? ['Steep assist equipment and safety gear'] : []),
      'Roofing tools and fasteners',
      'Material hoisting equipment',
      'Safety equipment and fall protection'
    ],
    safetyRequirements: report.laborRequirements?.safetyRequirements || [
      'OSHA compliant fall protection',
      'Hard hats and safety equipment',
      ...(project.roofPitch?.includes('Steep') ? ['Additional steep roof safety measures'] : []),
      'Weather monitoring protocols'
    ]
  };

  // Create material breakdown from form selections
  const materialBreakdown = report.materialBreakdown?.lineItems || 
    (project.lineItems?.map((item: string) => ({
      item: item,
      quantity: item.includes('Shingles') ? Math.ceil((project.area || 1200) / 100) : 
               item.includes('Underlayment') ? Math.ceil((project.area || 1200) / 100) : 1,
      unit: item.includes('Shingles') || item.includes('Underlayment') ? 'squares' : 
            item.includes('Linear') ? 'linear feet' : 'each',
      notes: 'Based on project specifications'
    })) || []);

  // Use Gemini cost estimates if available, otherwise calculate from form data
  const costEstimates = report.costEstimates || {
    materials: {
      total: (project.area || 1200) * (project.materialPreference === 'luxury' ? 8 : project.materialPreference === 'eco' ? 4 : 6),
      breakdown: [
        {
          category: 'Roofing Materials',
          amount: (project.area || 1200) * (project.materialPreference === 'luxury' ? 5 : project.materialPreference === 'eco' ? 2.5 : 3.5)
        },
        { category: 'Underlayment & Accessories', amount: (project.area || 1200) * 1.5 },
        { category: 'Flashing & Trim', amount: (project.area || 1200) * 1 }
      ]
    },
    labor: {
      total: (project.area || 1200) * (project.laborNeeds?.steepAssist ? 4 : 3),
      ratePerHour: project.laborNeeds?.steepAssist ? 75 : 65,
      totalHours: Math.ceil((project.area || 1200) / (project.laborNeeds?.steepAssist ? 80 : 100))
    },
    equipment: {
      total: project.laborNeeds?.steepAssist ? 800 : 500,
      items: [
        { item: 'Tool rental and equipment', cost: project.laborNeeds?.steepAssist ? 500 : 300 },
        { item: 'Safety equipment', cost: 200 },
        ...(project.laborNeeds?.steepAssist ? [{ item: 'Steep assist equipment', cost: 300 }] : [])
      ]
    }
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text(getLocalizedText('contractor_project_report', preferredLanguage), pageWidth/2, yPos, { align: 'center' });
  yPos += 15;

  // Project Details Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text(getLocalizedText('project_details', preferredLanguage), margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const detailsFields = [
    [getLocalizedText('project_address', preferredLanguage), projectDetails.address],
    [getLocalizedText('project_type', preferredLanguage), capitalizeWords(projectDetails.type)],
    [getLocalizedText('job_type', preferredLanguage), project.jobType ? capitalizeWords(project.jobType.replace('-', ' ')) : undefined],
    [getLocalizedText('material_preference', preferredLanguage), project.materialPreference ? capitalizeWords(project.materialPreference) : undefined],
    [getLocalizedText('total_area', preferredLanguage), projectDetails.dimensions?.totalArea ? `${projectDetails.dimensions.totalArea} sq ft` : undefined],
    [getLocalizedText('roof_pitch', preferredLanguage), projectDetails.dimensions?.pitch],
    [getLocalizedText('roof_age', preferredLanguage), project.roofAge ? `${project.roofAge} years` : undefined],
    [getLocalizedText('structure_type', preferredLanguage), project.structureType],
    [getLocalizedText('existing_materials', preferredLanguage), project.materialLayers?.join(', ')],
    [getLocalizedText('local_permit_required', preferredLanguage), project.localPermit ? 'Yes' : 'No']
  ].filter(([_, value]) => value && value.trim() !== '' && value !== 'Not specified') as [string, string][];

  detailsFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 60, yPos);
    yPos += 7;
  });
  yPos += 10;

  // Scope of Work Section (always show if we have tasks)
  const hasWorkTasks = Object.values(scopeOfWork).some(tasks => tasks.length > 0);
  if (hasWorkTasks) {
    doc.setFillColor(255, 102, 0);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.text(getLocalizedText('scope_of_work', preferredLanguage), margin + 5, yPos + 6);
    yPos += 15;

  doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const phases = [
      { title: getLocalizedText('preparation_tasks', preferredLanguage), tasks: scopeOfWork.preparationTasks },
      { title: getLocalizedText('removal_tasks', preferredLanguage), tasks: scopeOfWork.removalTasks },
      { title: getLocalizedText('installation_tasks', preferredLanguage), tasks: scopeOfWork.installationTasks },
      { title: getLocalizedText('finishing_tasks', preferredLanguage), tasks: scopeOfWork.finishingTasks }
    ];

    phases.forEach(phase => {
      if (phase.tasks.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(phase.title + ':', margin, yPos);
        yPos += 7;
        
        doc.setFont('helvetica', 'normal');
        phase.tasks.forEach((task: string) => {
          if (yPos > doc.internal.pageSize.height - 30) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• ${task}`, margin + 10, yPos);
          yPos += 5;
        });
        yPos += 5;
      }
    });
  }

  // Labor & Equipment Section
  if (yPos > doc.internal.pageSize.height - 100) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text(getLocalizedText('labor_equipment', preferredLanguage), margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const laborFields = [
    [getLocalizedText('crew_size', preferredLanguage), `${laborRequirements.crewSize} workers`],
    [getLocalizedText('estimated_days', preferredLanguage), `${laborRequirements.estimatedDays} days`],
    [getLocalizedText('steep_assist', preferredLanguage), project.laborNeeds?.steepAssist ? 'Required' : 'Not required']
  ];

  laborFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
    yPos += 7;
  });

  if (laborRequirements.specialEquipment.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Special Equipment:', margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    laborRequirements.specialEquipment.forEach((equipment: string) => {
      doc.text(`• ${equipment}`, margin + 10, yPos);
      yPos += 5;
    });
  }

  if (laborRequirements.safetyRequirements.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Safety Requirements:', margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    laborRequirements.safetyRequirements.forEach((requirement: string) => {
      doc.text(`• ${requirement}`, margin + 10, yPos);
      yPos += 5;
    });
  }
  yPos += 10;

  // Material Breakdown Table
  if (materialBreakdown.length > 0) {
    if (yPos > doc.internal.pageSize.height - 120) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(255, 102, 0);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.text(getLocalizedText('material_breakdown', preferredLanguage), margin + 5, yPos + 6);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Table headers
    const colWidths = [70, 25, 25, pageWidth - margin * 2 - 70 - 25 - 25 - 5]; // Last col gets remaining width
    const headers = [
      getLocalizedText('item', preferredLanguage), 
      getLocalizedText('qty', preferredLanguage), 
      getLocalizedText('unit', preferredLanguage), 
      getLocalizedText('notes', preferredLanguage)
    ];
    
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      let xPos = margin;
      for (let i = 0; i < index; i++) {
        xPos += colWidths[i];
      }
      doc.text(header, xPos, yPos);
    });
    yPos += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    materialBreakdown.forEach((item: MaterialItem) => {
      let xPos = margin;
      doc.text((item.item || '').substring(0, 30), xPos, yPos);
      xPos += colWidths[0];
      doc.text((item.quantity || 0).toString(), xPos, yPos);
      xPos += colWidths[1];
      doc.text(item.unit || '', xPos, yPos);
      xPos += colWidths[2];
      // Wrap notes text
      const notes = item.notes || '';
      const notesLines = doc.splitTextToSize(notes, colWidths[3] - 2);
      notesLines.forEach((line: string, i: number) => {
        doc.text(line, xPos, yPos + i * 5);
      });
      yPos += Math.max(7, notesLines.length * 5);
    });
    yPos += 10;
  }

  // Cost Estimates Section
  if (costEstimates.materials.total > 0 || costEstimates.labor.total > 0) {
    if (yPos > doc.internal.pageSize.height - 120) {
            doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(255, 102, 0);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.text(getLocalizedText('cost_estimates', preferredLanguage), margin + 5, yPos + 6);
    yPos += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Materials Cost
    if (costEstimates.materials.total > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(getLocalizedText('materials_cost', preferredLanguage), margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      costEstimates.materials.breakdown.forEach((item: CostBreakdownItem) => {
        doc.text(`${item.category}: ${formatCurrency(item.amount, preferredCurrency)}`, margin + 10, yPos);
        yPos += 5;
      });
      doc.setFont('helvetica', 'bold');
      doc.text(`${getLocalizedText('total_materials_cost', preferredLanguage)} ${formatCurrency(costEstimates.materials.total, preferredCurrency)}`, margin + 10, yPos);
      yPos += 10;
    }

    // Labor Cost
    if (costEstimates.labor.total > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(getLocalizedText('labor_cost', preferredLanguage), margin, yPos);
      yPos += 7;
          doc.setFont('helvetica', 'normal');
      doc.text(`${getLocalizedText('rate_per_hour', preferredLanguage)} ${formatCurrency(costEstimates.labor.ratePerHour, preferredCurrency)}`, margin + 10, yPos);
      yPos += 5;
      doc.text(`${getLocalizedText('total_hours', preferredLanguage)} ${costEstimates.labor.totalHours}`, margin + 10, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${getLocalizedText('total_labor_cost', preferredLanguage)} ${formatCurrency(costEstimates.labor.total, preferredCurrency)}`, margin + 10, yPos);
      yPos += 10;
    }

    // Equipment Cost
    if (costEstimates.equipment.total > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(getLocalizedText('equipment_cost', preferredLanguage), margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      costEstimates.equipment.items.forEach((item: EquipmentItem) => {
        doc.text(`${item.item}: ${formatCurrency(item.cost, preferredCurrency)}`, margin + 10, yPos);
        yPos += 5;
      });
      doc.setFont('helvetica', 'bold');
      doc.text(`${getLocalizedText('total_equipment_cost', preferredLanguage)} ${formatCurrency(costEstimates.equipment.total, preferredCurrency)}`, margin + 10, yPos);
      yPos += 10;
    }

    // Grand Total
    const grandTotal = costEstimates.materials.total + costEstimates.labor.total + costEstimates.equipment.total;
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 102, 0);
    doc.text(`${getLocalizedText('project_total', preferredLanguage)} ${formatCurrency(grandTotal, preferredCurrency)}`, margin, yPos);
  }
}

function addContractorImagePages(doc: jsPDF, uploadedFiles: any[], report?: any, preferredLanguage: string = 'english') {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  uploadedFiles.forEach((file: any, index: number) => {
    doc.addPage();
    let yPos = 20;

    // Page Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text(`${getLocalizedText('project_image', preferredLanguage)} ${index + 1} - ${getLocalizedText('repair_analysis', preferredLanguage)}`, pageWidth/2, yPos, { align: 'center' });
    yPos += 15;

    // Add the image if we have it
    if (file.data) {
      try {
        const imgWidth = pageWidth - 2*margin;
        const imgHeight = 120;
        doc.addImage(file.data, 'JPEG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      } catch (error) {
        console.error('Error adding image to PDF:', error);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Error loading image', margin, yPos);
        yPos += 10;
      }
    }

    // Add image analysis from Gemini if available
    const imageAnalysis = report?.imageAnalysis?.[index] || report?.imageAnalysis || 
      'Professional analysis: This image shows roofing conditions requiring contractor assessment for repair planning and material requirements.';
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 102, 0);
    doc.text(getLocalizedText('contractor_analysis', preferredLanguage), margin, yPos);
    yPos += 10;

                doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Split analysis into lines and add them to the PDF
    const lines = doc.splitTextToSize(imageAnalysis, pageWidth - 2*margin);
    lines.forEach((line: string) => {
      if (yPos > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  });
}

interface HomeownerReport {
  welcomeMessage: {
    greeting: string;
    introduction: string;
    ourCommitment: string;
  };
  roofOverview: {
    propertyType: string;
    roofAge: string;
    roofStyle: string;
    currentMaterials: string;
    overallCondition: string;
    keyFeatures: string[];
  };
  damageSummary: {
    inspectionFindings: string;
    priorityLevel: string;
    mainConcerns: string[];
    whatThisMeans: string;
  };
  repairSuggestions: {
    immediateActions: string[];
    shortTermPlanning: string[];
    longTermOutlook: {
      timeline: string;
      investmentGuidance: string;
      preventiveCare: string;
    };
  };
  budgetGuidance: {
    estimatedRange: {
      repairs: string;
      partialReplacement: string;
      fullReplacement: string;
    };
    financingOptions: string[];
    costSavingTips: string[];
  };
  nextSteps: {
    recommended: string[];
    questions: string[];
    warningSignsToWatch: string[];
  };
  imageAnalysis?: string[];
}

function addHomeownerReport(doc: jsPDF, project: any, estimate: any) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPos = 20;

  // Get user preferences
  const preferredLanguage = project.preferredLanguage || 'english';
  const preferredCurrency = project.preferredCurrency || 'USD';

  // Debug logging
  console.log('=== Homeowner Report Data ===');
  console.log('Project:', project);
  console.log('Estimate:', estimate);
  console.log('Report:', estimate?.report);
  console.log('Language:', preferredLanguage, 'Currency:', preferredCurrency);

  // Extract report data with fallbacks to form data
  const report = (estimate?.report || {}) as HomeownerReport;
  
  // Use form data as fallbacks with proper null checks
  const welcomeMessage = report.welcomeMessage || {
    greeting: `Dear ${project.homeownerInfo?.name || 'Homeowner'},`,
    introduction: `Thank you for choosing FlacronBuild for your roofing assessment. We've carefully analyzed your ${project.structureType || 'home'} and prepared this easy-to-understand report to help you make informed decisions about your roof.`,
    ourCommitment: "Our goal is to provide you with clear, honest information about your roof's condition and help you understand your options moving forward."
  };

  const roofOverview = report.roofOverview || {
    propertyType: project.structureType || 'Residential structure',
    roofAge: project.roofAge ? `${project.roofAge} years old` : 'Age not specified',
    roofStyle: project.roofPitch || 'Standard pitch',
    currentMaterials: project.materialLayers?.join(', ') || 'Standard roofing materials',
    overallCondition: `Based on the age and materials, your roof is ${project.roofAge > 20 ? 'reaching the end of its typical lifespan' : project.roofAge > 10 ? 'in the middle of its expected lifespan' : 'relatively new'}`,
    keyFeatures: [
      project.iceWaterShield ? 'Ice and water shield protection installed' : 'Standard underlayment',
      project.dripEdge ? 'Drip edge protection in place' : 'Basic edge protection',
      `Felt underlayment: ${project.felt || 'Standard grade'}`
    ]
  };

  const damageSummary = report.damageSummary || {
    inspectionFindings: `We've identified ${project.slopeDamage?.length || 0} areas of concern that need your attention`,
    priorityLevel: project.urgency === 'high' ? 'High Priority - Immediate attention recommended' : 
                  project.urgency === 'medium' ? 'Medium Priority - Address within 6 months' : 
                  'Low Priority - Monitor and plan for future repairs',
    mainConcerns: [
      project.roofAge > 15 ? 'Age-related wear and material deterioration' : 'Normal wear patterns for roof age',
      project.slopeDamage?.length > 0 ? 'Visible damage requiring professional attention' : 'No major structural concerns identified',
      'Weather protection effectiveness'
    ],
    whatThisMeans: `In simple terms, your roof ${project.roofAge > 20 || project.urgency === 'high' ? 'needs prompt attention to prevent water damage to your home' : project.roofAge > 10 ? 'is showing normal signs of aging and should be monitored closely' : 'appears to be in good condition for its age'}`
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text('YOUR ROOF ASSESSMENT REPORT', pageWidth/2, yPos, { align: 'center' });
  yPos += 20;

  // Welcome Message Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('WELCOME', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
  
  // Greeting - ensure it's a string
  doc.setFont('helvetica', 'bold');
  const greeting = String(welcomeMessage.greeting || 'Dear Homeowner,');
  doc.text(greeting, margin, yPos);
  yPos += 8;

  // Introduction - ensure it's a string and handle line wrapping
        doc.setFont('helvetica', 'normal');
  const introduction = String(welcomeMessage.introduction || 'Thank you for choosing FlacronBuild for your roofing assessment.');
  const introLines = doc.splitTextToSize(introduction, pageWidth - 2*margin);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Commitment - ensure it's a string
  doc.setFont('helvetica', 'italic');
  const commitment = String(welcomeMessage.ourCommitment || 'Our goal is to provide you with clear, honest information.');
  const commitmentLines = doc.splitTextToSize(commitment, pageWidth - 2*margin);
  commitmentLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Roof Overview Section
  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('YOUR ROOF OVERVIEW', margin + 5, yPos + 6);
  yPos += 15;

        doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Ensure all overview fields are strings
  const overviewFields = [
    ['Property Type:', String(roofOverview.propertyType || 'Not specified')],
    ['Roof Age:', String(roofOverview.roofAge || 'Not specified')],
    ['Roof Style:', String(roofOverview.roofStyle || 'Not specified')],
    ['Current Materials:', String(roofOverview.currentMaterials || 'Not specified')]
  ];

  overviewFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
    yPos += 7;
  });
  yPos += 5;

  // Overall Condition - ensure it's a string
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Condition:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const condition = String(roofOverview.overallCondition || 'Assessment pending');
  const conditionLines = doc.splitTextToSize(condition, pageWidth - 2*margin);
  conditionLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Key Features - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text('Key Features:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const keyFeatures = roofOverview.keyFeatures || ['Standard roofing features'];
  keyFeatures.forEach((feature: string) => {
    const featureText = String(feature || 'Standard feature');
    doc.text(`• ${featureText}`, margin + 10, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Damage Summary Section
  if (yPos > doc.internal.pageSize.height - 100) {
          doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('WHAT WE FOUND', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Priority Level - make it prominent and ensure it's a string
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Priority Level:', margin, yPos);
  yPos += 8;
  doc.setFontSize(11);
  const priorityLevel = String(damageSummary.priorityLevel || 'Assessment pending');
  doc.setTextColor(priorityLevel.includes('High') ? 220 : priorityLevel.includes('Medium') ? 180 : 60, 
                   priorityLevel.includes('High') ? 50 : 120, 50);
  doc.text(priorityLevel, margin + 10, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Inspection Findings - ensure it's a string
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Findings:', margin, yPos);
  yPos += 7;
            doc.setFont('helvetica', 'normal');
  const findings = String(damageSummary.inspectionFindings || 'Inspection completed');
  const findingsLines = doc.splitTextToSize(findings, pageWidth - 2*margin);
  findingsLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Main Concerns - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text('Main Concerns:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const mainConcerns = damageSummary.mainConcerns || ['General roof assessment'];
  mainConcerns.forEach((concern: string) => {
    const concernText = String(concern || 'Standard concern');
    doc.text(`• ${concernText}`, margin + 10, yPos);
    yPos += 6;
  });
  yPos += 5;

  // What This Means - ensure it's a string
  doc.setFont('helvetica', 'bold');
  doc.text('What This Means for You:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const meaning = String(damageSummary.whatThisMeans || 'Our assessment is complete');
  const meaningLines = doc.splitTextToSize(meaning, pageWidth - 2*margin);
  meaningLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Repair Suggestions Section
  if (yPos > doc.internal.pageSize.height - 120) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('OUR RECOMMENDATIONS', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const repairSuggestions = report.repairSuggestions || {
    immediateActions: [
      project.urgency === 'high' ? 'Contact a licensed roofer within 2 weeks' : 'Schedule a professional inspection',
      project.slopeDamage?.length > 0 ? 'Address visible damage areas to prevent water intrusion' : 'Continue regular maintenance and monitoring',
      'Monitor for leaks during heavy rain'
    ],
    shortTermPlanning: [
      project.budgetStyle === 'premium' ? 'Consider high-quality materials for maximum longevity' : 
      project.budgetStyle === 'basic' ? 'Focus on essential repairs with cost-effective solutions' : 
      'Balance quality and cost for best value',
      'Get quotes from 3 licensed contractors',
      'Plan timing around weather and personal schedule'
    ],
    longTermOutlook: {
      timeline: project.roofAge > 20 ? 'Replacement recommended within 1-2 years' : 
               project.roofAge > 15 ? 'Start planning for replacement in 3-5 years' : 
               'Roof should last another 10-15 years with proper maintenance',
      investmentGuidance: `For a roof of this age and condition, ${project.budgetStyle === 'premium' ? 'investing in premium materials will provide the best long-term value' : project.budgetStyle === 'basic' ? 'focus on necessary repairs to maintain protection' : 'a balanced approach offers good protection and value'}`,
      preventiveCare: 'Regular maintenance can extend your roof\'s life and prevent costly emergency repairs'
    }
  };

  // Immediate Actions - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text('Immediate Actions:', margin, yPos);
  yPos += 7;
            doc.setFont('helvetica', 'normal');
  const immediateActions = repairSuggestions.immediateActions || ['Schedule professional consultation'];
  immediateActions.forEach((action: string) => {
    const actionText = String(action || 'Recommended action');
    doc.text(`• ${actionText}`, margin + 10, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Short Term Planning - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text('Short Term Planning (3-6 months):', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const shortTermPlanning = repairSuggestions.shortTermPlanning || ['Develop maintenance plan'];
  shortTermPlanning.forEach((plan: string) => {
    const planText = String(plan || 'Planning item');
    const planLines = doc.splitTextToSize(`• ${planText}`, pageWidth - 2*margin - 10);
    planLines.forEach((line: string) => {
      doc.text(line, margin + 10, yPos);
      yPos += 6;
    });
  });
  yPos += 5;

  // Long Term Outlook - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text('Long Term Outlook:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  
  const timeline = String(repairSuggestions.longTermOutlook?.timeline || 'Long-term maintenance recommended');
  doc.text(`Timeline: ${timeline}`, margin + 10, yPos);
  yPos += 6;
  
  const investmentGuidance = String(repairSuggestions.longTermOutlook?.investmentGuidance || 'Consider professional guidance for investment decisions');
  const guidanceLines = doc.splitTextToSize(`Investment: ${investmentGuidance}`, pageWidth - 2*margin - 10);
  guidanceLines.forEach((line: string) => {
    doc.text(line, margin + 10, yPos);
    yPos += 6;
  });
  
  const preventiveCare = String(repairSuggestions.longTermOutlook?.preventiveCare || 'Regular maintenance is recommended');
  const careLines = doc.splitTextToSize(`Care: ${preventiveCare}`, pageWidth - 2*margin - 10);
  careLines.forEach((line: string) => {
    doc.text(line, margin + 10, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Budget Guidance Section (if space, otherwise new page)
  if (yPos > doc.internal.pageSize.height - 80) {
    doc.addPage();
    yPos = 20;
  }

  const budgetGuidance = report.budgetGuidance || {
    estimatedRange: {
      repairs: project.urgency === 'high' ? `${formatCurrency(2000, preferredCurrency)} - ${formatCurrency(8000, preferredCurrency)}` : project.urgency === 'medium' ? `${formatCurrency(1000, preferredCurrency)} - ${formatCurrency(4000, preferredCurrency)}` : `${formatCurrency(500, preferredCurrency)} - ${formatCurrency(2000, preferredCurrency)}`,
      partialReplacement: formatCurrency(Math.round((project.area || 1200) * (project.budgetStyle === 'premium' ? 8 : project.budgetStyle === 'basic' ? 4 : 6) * 0.5), preferredCurrency),
      fullReplacement: formatCurrency(Math.round((project.area || 1200) * (project.budgetStyle === 'premium' ? 12 : project.budgetStyle === 'basic' ? 6 : 8)), preferredCurrency)
    },
    financingOptions: [
      getLocalizedText('home_improvement_loans', preferredLanguage),
      getLocalizedText('insurance_claims', preferredLanguage),
      getLocalizedText('contractor_payment_plans', preferredLanguage),
      getLocalizedText('home_equity_line', preferredLanguage)
    ],
    costSavingTips: [
      'Get multiple quotes for comparison',
      'Consider timing repairs during off-season',
      'Bundle multiple home improvements',
      'Ask about material upgrade options'
    ]
  };

  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('BUDGET PLANNING', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Estimated Ranges - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text(getLocalizedText('estimated_range', preferredLanguage), margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const repairs = String(budgetGuidance.estimatedRange?.repairs || 'Contact for estimate');
  const partialReplacement = String(budgetGuidance.estimatedRange?.partialReplacement || 'Contact for estimate');
  const fullReplacement = String(budgetGuidance.estimatedRange?.fullReplacement || 'Contact for estimate');
  
  doc.text(`${getLocalizedText('repairs', preferredLanguage)} ${repairs}`, margin + 10, yPos);
  yPos += 6;
  doc.text(`${getLocalizedText('partial_replacement', preferredLanguage)} ${partialReplacement}`, margin + 10, yPos);
  yPos += 6;
  doc.text(`${getLocalizedText('full_replacement', preferredLanguage)} ${fullReplacement}`, margin + 10, yPos);
  yPos += 10;

  // Financing Options - ensure all are strings
  doc.setFont('helvetica', 'bold');
  doc.text(getLocalizedText('financing_options', preferredLanguage), margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const financingOptions = budgetGuidance.financingOptions || ['Consult with financial advisor'];
  financingOptions.forEach((option: string) => {
    const optionText = String(option || 'Financing option');
    doc.text(`• ${optionText}`, margin + 10, yPos);
    yPos += 6;
  });

  // Add Glossary Section for homeowners
  if (yPos > doc.internal.pageSize.height - 120) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 15;
  }

  doc.setFillColor(255, 102, 0);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.text('ROOFING TERMS EXPLAINED', margin + 5, yPos + 6);
  yPos += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Glossary of common roofing terms for homeowners
  const glossaryTerms = [
    {
      term: 'Drip Edge',
      definition: 'Metal strips installed along roof edges to direct water away from fascia and into gutters, preventing water damage.'
    },
    {
      term: 'Ice and Water Shield',
      definition: 'A waterproof membrane applied to vulnerable roof areas (like valleys and eaves) to prevent ice dams and water infiltration.'
    },
    {
      term: 'Felt Underlayment',
      definition: 'Protective barrier installed beneath roofing materials to provide additional waterproofing and weather protection.'
    },
    {
      term: 'Roof Pitch',
      definition: 'The steepness of your roof measured as rise over run. Low slope (2-4/12), medium (4-8/12), steep (8+/12).'
    },
    {
      term: 'Flashing',
      definition: 'Metal pieces that seal joints and transitions on your roof (around chimneys, vents, valleys) to prevent water leaks.'
    },
    {
      term: 'Ridge Vent',
      definition: 'Ventilation system installed along the roof peak to allow hot air to escape from your attic, improving energy efficiency.'
    },
    {
      term: 'Gutters & Downspouts',
      definition: 'System that collects rainwater from your roof and directs it away from your home\'s foundation.'
    },
    {
      term: 'Shingles/Materials',
      definition: 'The visible outer layer of your roof. Common types include asphalt shingles, metal, tile, or slate.'
    },
    {
      term: 'Soffit & Fascia',
      definition: 'Soffit: underside of roof overhang. Fascia: vertical board along roof edge. Both protect roof structure and support gutters.'
    },
    {
      term: 'Square',
      definition: 'Roofing measurement unit. One square = 100 square feet of roof area. Used for material and labor calculations.'
    }
  ];

  glossaryTerms.forEach((item) => {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 30) {
      doc.addPage();
      yPos = 20;
    }

    // Term in bold
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.term}:`, margin, yPos);
    yPos += 6;

    // Definition with word wrap
    doc.setFont('helvetica', 'normal');
    const definitionLines = doc.splitTextToSize(item.definition, pageWidth - 2*margin - 10);
    definitionLines.forEach((line: string) => {
      doc.text(line, margin + 10, yPos);
      yPos += 5;
    });
    yPos += 3; // Small gap between terms
  });

  // Add helpful note at the end
  yPos += 10;
  if (yPos > doc.internal.pageSize.height - 40) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const noteText = "This glossary explains common roofing terms to help you understand your roof better. Don't hesitate to ask your contractor to explain any technical terms during your consultation.";
  const noteLines = doc.splitTextToSize(noteText, pageWidth - 2*margin);
  noteLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
}

function addHomeownerImagePages(doc: jsPDF, uploadedFiles: any[], report?: any) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  uploadedFiles.forEach((file: any, index: number) => {
    doc.addPage();
    let yPos = 20;

    // Page Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text(`Photo ${index + 1} - What You're Seeing`, pageWidth/2, yPos, { align: 'center' });
    yPos += 15;

    // Add the image if we have it
    if (file.data) {
      try {
        const imgWidth = pageWidth - 2*margin;
        const imgHeight = 120;
        doc.addImage(file.data, 'JPEG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      } catch (error) {
        console.error('Error adding image to PDF:', error);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Error loading image', margin, yPos);
        yPos += 10;
      }
    }

    // Add friendly image analysis 
    const imageAnalysis = report?.imageAnalysis?.[index] || report?.imageAnalysis || 
      'This photo shows your roof\'s current condition. We\'ve examined this area for signs of wear, damage, or potential issues that may need attention. Look for any visible signs mentioned in our recommendations section.';
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 102, 0);
    doc.text('What This Photo Shows:', margin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Split analysis into lines and add them to the PDF
    const lines = doc.splitTextToSize(imageAnalysis, pageWidth - 2*margin);
    lines.forEach((line: string) => {
      if (yPos > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  });
}

export async function generatePDFReport(project: any, estimate: any, options?: { openInNewTab?: boolean; username?: string }) {
  console.log('=== PDF GENERATOR DEBUG: generatePDFReport ===');
  console.log('Project object passed in:', project);
  console.log('Estimate object passed in:', estimate);
  console.log('Estimate.report specifically:', estimate?.report);
  console.log('Estimate.formInputData:', estimate?.formInputData);
  console.log('Estimate.geminiResponse:', estimate?.geminiResponse);
  console.log('Options:', options);
  
  // Debug the stored data structures
  console.log('=== PDF GENERATOR: Data Analysis ===');
  if (estimate?.formInputData) {
    console.log('Form input data keys:', Object.keys(estimate.formInputData));
    console.log('Form input data size:', JSON.stringify(estimate.formInputData).length, 'characters');
    console.log('Form input userRole:', estimate.formInputData.userRole);
    console.log('Form input has location:', !!estimate.formInputData.location);
    console.log('Form input has inspector fields:', !!(estimate.formInputData.inspectorInfo || estimate.formInputData.inspectionDate));
    console.log('Form input has insurer fields:', !!(estimate.formInputData.claimNumber || estimate.formInputData.policyholderName));
    console.log('Form input has contractor fields:', !!(estimate.formInputData.jobType || estimate.formInputData.materialPreference));
    console.log('Form input has homeowner fields:', !!(estimate.formInputData.homeownerInfo || estimate.formInputData.urgency));
    } else {
    console.log('No form input data found in estimate');
  }
  
  if (estimate?.geminiResponse) {
    console.log('Gemini response keys:', Object.keys(estimate.geminiResponse));
    console.log('Gemini response size:', JSON.stringify(estimate.geminiResponse).length, 'characters');
    console.log('Gemini response metadata:', estimate.geminiResponse.metadata);
    console.log('Gemini response has actual response:', !!estimate.geminiResponse.response);
  } else {
    console.log('No Gemini response data found in estimate');
  }
  
  const doc = new jsPDF();
  
  // Get images from localStorage
  const storedFiles = localStorage.getItem("estimation-upload");
  const uploadedFiles = storedFiles ? JSON.parse(storedFiles) : [];
  console.log('=== PDF GENERATOR: Image Data ===');
  console.log('Images found in localStorage:', uploadedFiles.length);
  
  // PAGE 1: BRANDING PAGE
  addBrandingPage(doc);
  
  // PAGE 2: Role-specific Report Content
  if (project.userRole === 'inspector') {
    doc.addPage();
    addInspectorReport(doc, project, estimate);
    
    // IMAGE PAGES: Add images from localStorage with annotations
    if (uploadedFiles.length > 0) {
      addInspectorImagePages(doc, uploadedFiles, estimate.report);
    }
  } else if (project.userRole === 'insurance-adjuster') {
    doc.addPage();
    addInsuranceReport(doc, project, estimate);
    
    // Add insurance-specific image pages with damage annotations
    if (uploadedFiles.length > 0) {
      addInsuranceImagePages(doc, uploadedFiles, estimate.report);
    }
  } else if (project.userRole === 'contractor') {
    doc.addPage();
    addContractorReport(doc, project, estimate);
    
    // Add contractor-specific image pages with repair indicators
    if (uploadedFiles.length > 0) {
      addContractorImagePages(doc, uploadedFiles, estimate.report, project.preferredLanguage || 'english');
    }
  } else if (project.userRole === 'homeowner') {
    doc.addPage();
    addHomeownerReport(doc, project, estimate);
    
    // Add homeowner-friendly image pages with explanations
    if (uploadedFiles.length > 0) {
      addHomeownerImagePages(doc, uploadedFiles, estimate.report);
    }
  }
  
  // LAST PAGE: BRANDING PAGE
  doc.addPage();
  addBrandingPage(doc);
  
  // Generate safe filename
  const safeProject = (project.name || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeUser = options?.username ? options.username.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = safeUser 
    ? `${safeUser}_${safeProject}_${timestamp}_FlacronBuild.pdf` 
    : `${safeProject}_${timestamp}_FlacronBuild.pdf`;

  // Prepare structured data for Firebase storage
  const structuredData = {
    pdf: {
      fileName: fileName,
      fileSize: doc.output('blob').size,
      pdfBase64: doc.output('datauristring'),
      generatedAt: new Date().toISOString(),
      projectType: project.userRole || 'unknown',
      uploadedBy: options?.username || 'anonymous'
    },
    formInputData: estimate?.formInputData || null,
    geminiResponse: estimate?.geminiResponse || null,
    project: {
      id: project.id || null,
      name: project.name || null,
      userRole: project.userRole || null,
      type: project.type || null,
      location: project.location || null,
      area: project.area || null
    },
    estimate: {
      id: estimate.id || null,
      totalCost: estimate.totalCost || null,
      materialsCost: estimate.materialsCost || null,
      laborCost: estimate.laborCost || null,
      createdAt: estimate.createdAt || null
    }
  };

  console.log('=== PDF GENERATOR: Storing Structured Data ===');
  console.log('Structured data keys:', Object.keys(structuredData));
  console.log('Structured data size:', JSON.stringify(structuredData).length, 'characters');
  console.log('Has form input data:', !!structuredData.formInputData);
  console.log('Has Gemini response:', !!structuredData.geminiResponse);

  // Save structured data to Firebase
  try {
    const user = auth.currentUser;
    if (user) {
      console.log('=== PDF GENERATOR: Saving to Firebase ===');
      
      // Sanitize the data to remove undefined values
      const sanitizedData = sanitizeForFirebase({
        ...structuredData,
        userId: user.uid,
        createdAt: new Date()
      });
      
      console.log('=== PDF GENERATOR: Data Sanitized for Firebase ===');
      console.log('Sanitized data keys:', Object.keys(sanitizedData));
      console.log('Sanitized data size:', JSON.stringify(sanitizedData).length, 'characters');
      
      const docRef = await addDoc(collection(db, "pdfs"), sanitizedData);
      console.log('Structured data saved to Firebase with ID:', docRef.id);
    } else {
      console.log('No authenticated user - structured data not saved to Firebase');
    }
  } catch (error: any) {
    console.error('Error saving structured data to Firebase:', error);
    console.error('Error details:', {
      name: error?.name,
      code: error?.code,
      message: error?.message
    });
    // Log the problematic data structure for debugging
    console.error('Data that failed to save:', JSON.stringify(structuredData, null, 2));
  }

  // Save or open the PDF
  if (options?.openInNewTab) {
    window.open(URL.createObjectURL(doc.output('blob')));
    } else {
    doc.save(fileName);
  }
  
  // Return metadata needed for response
  return {
    pdfDoc: doc,
    fileName: fileName,
    fileSize: doc.output('blob').size,
    pdfBase64: doc.output('datauristring'),
    timestamp: new Date().toISOString(),
    projectType: project.userRole || 'unknown',
    uploadedBy: options?.username || 'anonymous',
    structuredData: structuredData
  };
}

function addBrandingPage(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Modern black background
  doc.setFillColor(33, 33, 33);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Top orange accent bar
  doc.setFillColor(255, 102, 0);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  // Bottom orange accent bar  
  doc.setFillColor(255, 102, 0);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(255, 102, 0);
  } else {
    doc.setTextColor(255, 102, 0);
  }
  doc.setFontSize(48);
  doc.text('FLACRONBUILD', pageWidth/2, pageHeight/2, { angle: 35, align: 'center' });
  doc.restoreGraphicsState && doc.restoreGraphicsState();
  
  // Premium white content area
  const contentX = 20;
  const contentY = 35;
  const contentW = pageWidth - 40;
  const contentH = pageHeight - 70;
  
  doc.setFillColor(255, 255, 255);
  doc.rect(contentX, contentY, contentW, contentH, 'F');
  
  // Company logo/name - FLACRON in black, BUILD in orange
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  
  // Calculate text positioning for split coloring
  const logoY = 75;
  const flacronText = 'FLACRON';
  const buildText = 'BUILD';
  
  // Measure text to position correctly
  const flacronWidth = doc.getTextWidth(flacronText);
  const buildWidth = doc.getTextWidth(buildText);
  const totalWidth = flacronWidth + buildWidth;
  const startX = (pageWidth - totalWidth) / 2;
  
  // FLACRON in black
  doc.setTextColor(33, 33, 33);
  doc.text(flacronText, startX, logoY);
  
  // BUILD in orange
  doc.setTextColor(255, 102, 0);
  doc.text(buildText, startX + flacronWidth, logoY);
  
  // Elegant separator line in orange
  doc.setDrawColor(255, 102, 0);
  doc.setLineWidth(1.5);
  doc.line(pageWidth/2 - 35, 85, pageWidth/2 + 35, 85);
  
  // Professional subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(255, 102, 0);
  doc.text('ESTIMATE SMARTER. BUILD BETTER.', pageWidth/2, 100, { align: 'center' });
  
  // Premium tagline
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Advanced Analytics • Market Intelligence • Precision Estimates', pageWidth/2, 115, { align: 'center' });
  
  // Professional services section
  const servicesY = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text('PROFESSIONAL ROOFING INTELLIGENCE', pageWidth/2, servicesY, { align: 'center' });
  
  // Services list - clean professional layout, centered
  const services = [
    'Professional Inspector Reports & Certifications',
    'Insurance Adjuster Claims Documentation',
    'Contractor Project Specifications & Estimates', 
    'Homeowner-Friendly Explanations & Guidance'
  ];
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  services.forEach((service, i) => {
    const serviceY = servicesY + 12 + (i * 15);
    doc.text(service, pageWidth/2, serviceY, { align: 'center' });
  });
  
  // Value proposition section
  const valueY = 210;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 102, 0);
  doc.text('TRUSTED BY INDUSTRY LEADERS', pageWidth/2, valueY, { align: 'center' });
  
  // Key metrics in clean rows
  const metrics = [
    { value: '95%', label: 'Accuracy Rate' },
    { value: '10,000+', label: 'Projects Analyzed' },
    { value: '$2B+', label: 'Total Project Value' },
    { value: '500+', label: 'Partner Contractors' }
  ];
  
  // Two rows of metrics - properly centered
  const metricsStartY = valueY + 15;
  const rowHeight = 20;
  
  // First row (2 metrics)
  const firstRowY = metricsStartY;
  const spacing = pageWidth / 3;
  
  for (let i = 0; i < 2; i++) {
    const metric = metrics[i];
    const xPos = spacing * (i + 1);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 102, 0);
    doc.text(metric.value, xPos, firstRowY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(metric.label, xPos, firstRowY + 8, { align: 'center' });
  }
  
  // Second row (2 metrics)
  const secondRowY = metricsStartY + rowHeight;
  
  for (let i = 2; i < 4; i++) {
    const metric = metrics[i];
    const xPos = spacing * ((i - 2) + 1);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 102, 0);
    doc.text(metric.value, xPos, secondRowY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(metric.label, xPos, secondRowY + 8, { align: 'center' });
  }
  
  // Simple copyright footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('© FlacronBuild', pageWidth/2, pageHeight - 8, { align: 'center' });
}

function addInspectorReport(doc: jsPDF, project: any, estimate: any) {
  // Get user preferences
  const preferredLanguage = project.preferredLanguage || 'english';
  const preferredCurrency = project.preferredCurrency || 'USD';

  // Add diagonal watermark
    doc.saveGraphicsState && doc.saveGraphicsState();
    let gState;
    if (doc.setGState) {
      gState = doc.GState && doc.GState({ opacity: 0.08 });
      if (gState) doc.setGState(gState);
      doc.setTextColor(255, 102, 0);
    } else {
      doc.setTextColor(255, 102, 0);
    }
    doc.setFontSize(48);
    doc.text('FLACRONBUILD', 105, 148, { angle: 35, align: 'center' });
    doc.restoreGraphicsState && doc.restoreGraphicsState();
    
    let y = 20;
  
  // Title
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
  doc.text('PROFESSIONAL INSPECTOR REPORT', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(1);
    doc.line(20, y, 190, y);
    y += 15;
    
  // Inspector Name & Contact
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTOR CERTIFICATION', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 8;
  const inspectorName = project.inspectorInfo?.name || 'Inspector name not provided';
  const inspectorLicense = project.inspectorInfo?.license || 'License not provided';
  const inspectorContact = project.inspectorInfo?.contact || 'Contact info not provided';
  doc.text(`Inspector: ${inspectorName}`, 20, y);
  y += 6;
  doc.text(`License: ${inspectorLicense}`, 20, y);
  y += 6;
  doc.text(`Contact: ${inspectorContact}`, 20, y);
  y += 12;
  
  // Inspection Date & Time
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTION DETAILS', 20, y);
  doc.setFont('helvetica', 'normal');
    y += 8;
  const inspectionDate = project.inspectionDate || 'Date not provided';
  const weatherConditions = project.weatherConditions || 'Weather not specified';
  doc.text(`Date: ${inspectionDate}`, 20, y);
  y += 6;
  doc.text(`Weather Conditions: ${weatherConditions}`, 20, y);
  y += 12;
  
  // Address & GPS Coordinates
      doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY LOCATION', 20, y);
      doc.setFont('helvetica', 'normal');
  y += 8;
  const location = project.location;
  if (location && typeof location === 'object') {
    doc.text(`Address: ${location.city}, ${location.country} ${location.zipCode}`, 20, y);
  } else {
    doc.text(`Address: ${location || 'Location not provided'}`, 20, y);
  }
  y += 12;
  
  // Structure Overview
          doc.setFont('helvetica', 'bold');
  doc.text('STRUCTURE ANALYSIS', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text(`Type: ${project.structureType || 'Not specified'}`, 20, y);
  y += 6;
  doc.text(`Roof Pitch: ${project.roofPitch || 'Not specified'}`, 20, y);
  y += 6;
  doc.text(`Age: ${project.roofAge || 'Not specified'} years`, 20, y);
  y += 6;
  const materialLayers = project.materialLayers?.join(', ') || 'Not specified';
  doc.text(`Materials: ${materialLayers}`, 20, y, { maxWidth: 150 });
  y += 12;
          
          // Check if we need a new page
  if (y > 250) {
            doc.addPage();
    y = 20;
                // Add watermark to new page
            doc.saveGraphicsState && doc.saveGraphicsState();
    if (doc.setGState && gState) doc.setGState(gState);
              doc.setTextColor(255, 102, 0);
            doc.setFontSize(48);
            doc.text('FLACRONBUILD', 105, 148, { angle: 35, align: 'center' });
            doc.restoreGraphicsState && doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
  }
  
  // Slope-by-slope Condition Table
  doc.setFont('helvetica', 'bold');
  doc.text('SLOPE-BY-SLOPE CONDITIONS', 20, y);
                doc.setFont('helvetica', 'normal');
  y += 8;
  if (project.slopeDamage && project.slopeDamage.length > 0) {
    project.slopeDamage.forEach((damage: any, index: number) => {
      doc.text(`Slope ${index + 1}: ${damage.slope || 'Not specified'}`, 20, y);
      y += 5;
      doc.text(`  Damage Type: ${damage.damageType || 'Not specified'}`, 25, y);
              y += 5;
      doc.text(`  Severity: ${damage.severity || 'Not specified'}`, 25, y);
            y += 5;
      doc.text(`  Description: ${damage.description || 'No description'}`, 25, y, { maxWidth: 140 });
      y += 8;
    });
  } else {
    doc.text('No slope damage reported', 20, y);
    y += 8;
  }
  y += 4;
  
  // Roofing Components
  doc.setFont('helvetica', 'bold');
  doc.text('ROOFING COMPONENTS ASSESSMENT', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text(`Felt: ${project.felt || 'Not specified'}`, 20, y);
  y += 6;
  doc.text(`Ice/Water Shield: ${project.iceWaterShield ? 'Present' : 'Not present'}`, 20, y);
  y += 6;
  doc.text(`Drip Edge: ${project.dripEdge ? 'Present' : 'Not present'}`, 20, y);
  y += 6;
  doc.text(`Gutter Apron: ${project.gutterApron ? 'Present' : 'Not present'}`, 20, y);
  y += 6;
  if (project.pipeBoots && project.pipeBoots.length > 0) {
    const pipeBootsText = project.pipeBoots.map((boot: any) => `${boot.size} (${boot.quantity})`).join(', ');
    doc.text(`Pipe Boots: ${pipeBootsText}`, 20, y);
      } else {
    doc.text('Pipe Boots: None specified', 20, y);
  }
  y += 6;
  const fasciaCondition = project.fascia?.condition || 'Not specified';
  doc.text(`Fascia Condition: ${fasciaCondition}`, 20, y);
  y += 6;
  const gutterCondition = project.gutter?.condition || 'Not specified';
  doc.text(`Gutter Condition: ${gutterCondition}`, 20, y);
  y += 12;
  
  // Inspector Notes & Equipment
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTOR NOTES & EQUIPMENT', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 8;
  if (project.accessTools && project.accessTools.length > 0) {
    doc.text(`Equipment Used: ${project.accessTools.join(', ')}`, 20, y, { maxWidth: 150 });
    y += 8;
    } else {
    doc.text('Equipment Used: Not specified', 20, y);
    y += 6;
  }
  if (project.ownerNotes) {
    doc.text('Owner Notes:', 20, y);
    y += 6;
    const noteLines = doc.splitTextToSize(project.ownerNotes, 150);
    noteLines.forEach((line: string) => {
      doc.text(line, 20, y);
      y += 5;
    });
      } else {
    doc.text('Owner Notes: None provided', 20, y);
  }
}

function addInspectorImagePages(doc: jsPDF, uploadedFiles: any[], report?: any) {
  // Get annotations from the report
  let annotations: string[] = [];
  if (report && report.annotatedPhotographicEvidence) {
    annotations = report.annotatedPhotographicEvidence;
  }
  
  uploadedFiles.forEach((imageFile, index) => {
    doc.addPage();
    
    // Add diagonal watermark
    doc.saveGraphicsState && doc.saveGraphicsState();
    let gState;
    if (doc.setGState) {
      gState = doc.GState && doc.GState({ opacity: 0.08 });
      if (gState) doc.setGState(gState);
      doc.setTextColor(255, 102, 0);
    } else {
      doc.setTextColor(255, 102, 0);
    }
    doc.setFontSize(48);
    doc.text('FLACRONBUILD', 105, 148, { angle: 35, align: 'center' });
    doc.restoreGraphicsState && doc.restoreGraphicsState();
    
    let y = 20;
    
    // Page title
    doc.setFontSize(16);
    doc.setTextColor(33, 53, 153);
    doc.text(`PHOTOGRAPHIC EVIDENCE ${index + 1}`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setDrawColor(33, 53, 153);
    doc.setLineWidth(1);
    doc.line(20, y, 190, y);
    y += 15;
    
    // Image annotation
  doc.setFontSize(11);
    const annotation = annotations[index] || 'Professional inspection photo - analysis pending';
    const annotationLines = doc.splitTextToSize(annotation, 150);
    annotationLines.forEach((line: string) => {
      doc.text(line, 20, y);
      y += 6;
    });
    y += 10;
    
    // Add the actual image
  if (imageFile && imageFile.data) {
    try {
        const imgWidth = 150;
        const imgHeight = 100;
        doc.addImage(imageFile.data, 'JPEG', 20, y, imgWidth, imgHeight);
        y += imgHeight + 10;
        
        // Image details
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Image: ${imageFile.name || 'Inspection Photo'}`, 20, y);
        y += 4;
        doc.text(`Size: ${Math.round(imageFile.size / 1024)} KB`, 20, y);
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
        doc.rect(20, y, 150, 100);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
        doc.text('[Image could not be loaded]', 25, y + 50);
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
      doc.rect(20, y, 150, 100);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
      doc.text('[No image available]', 25, y + 50);
  }
  });
}
