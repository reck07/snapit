import { Platform, Share, Alert } from 'react-native';
import { getAllForExport } from '../database/database';

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows) {
  const headers = [
    'Brand',
    'Device Type',
    'Model',
    'Purchase Date',
    'Service Date',
    'Day',
    'Time',
    'Note',
    'Cost',
    'Repairman Name',
    'Repairman Contact',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.brand,
        row.device_type,
        row.model_name,
        row.purchase_date,
        row.date,
        row.day,
        row.time,
        row.note,
        row.cost,
        row.repairman_name,
        row.repairman_contact,
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

export async function exportAllCSV() {
  const rows = await getAllForExport();
  if (rows.length === 0) {
    Alert.alert('Nothing to export', 'Add at least one device first.');
    return;
  }
  const csv = buildCsv(rows);

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapit-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    await Share.share({
      message: csv,
      title: 'Snap It History (CSV)',
    });
  } catch (e) {
    Alert.alert('Export failed', e.message);
  }
}
