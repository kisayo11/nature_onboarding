/**
 * Google Sheets API 기반 데이터베이스 연동 엔진
 * - 마스터 시트 열 헤더 및 기존 데이터 구조 정밀 준수
 * - 입사자(Onboarding) / 퇴사자(Offboarding) 시트 기록
 * - Upsert (기존 행 검색 후 업데이트, 없을 경우 신규 추가) 처리
 */

import { google } from 'googleapis';

export class GoogleSheetsService {
  constructor(auth, spreadsheetId) {
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = spreadsheetId;
  }

  // 1. 설정값 읽기 (솔라피 & 슬랙 설정 시트)
  async loadConfig() {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "'솔라피&슬랙 설정'!A2:C20"
      });
      const rows = res.data.values || [];
      const config = {};
      rows.forEach(row => {
        if (row[0]) config[row[0].trim()] = (row[1] || '').trim();
      });
      return config;
    } catch (err) {
      console.warn("Failed to load config from sheet:", err.message);
      return {};
    }
  }

  // 2. 입사자 / 퇴사자 시트 행 추가 또는 기존 행 업데이트 (Upsert)
  async saveRecord({ isOffboarding, data, docUrl1, docUrl2, signatureUrl }) {
    const sheetName = isOffboarding ? "퇴사자(Offboarding)" : "입사자(Onboarding)";
    const now = new Date();
    const timestampStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()} ${now.getHours() >= 12 ? '오후' : '오전'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 전체 기존 데이터 읽어오기
    const getRes = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${sheetName}'!A1:Z5000`
    });

    const sheetData = getRes.data.values || [];
    let matchedRowIndex = -1; // 1-indexed

    if (!isOffboarding) {
      // 입사자 매칭: 이름(B열 index 1) + 생년월일(E열 index 4)
      for (let i = 1; i < sheetData.length; i++) {
        const rowName = (sheetData[i][1] || '').trim();
        const rowBirth = (sheetData[i][4] || '').trim();
        if (rowName === (data.name || '').trim() && rowBirth === (data.birth || '').trim()) {
          matchedRowIndex = i + 1; // 1-indexed
          break;
        }
      }
    } else {
      // 퇴사자 매칭: 이름(B열 index 1) + 사직일(E열 index 4)
      for (let i = 1; i < sheetData.length; i++) {
        const rowName = (sheetData[i][1] || '').trim();
        const rowResignDate = (sheetData[i][4] || '').trim();
        if (rowName === (data.name || '').trim() && rowResignDate === (data.resignDate || '').trim()) {
          matchedRowIndex = i + 1; // 1-indexed
          break;
        }
      }
    }

    if (matchedRowIndex !== -1) {
      // 기존 행이 존재하는 경우: 기존 데이터 유지하면서 서류/서명/결과값만 업데이트
      if (!isOffboarding) {
        // [입사자] A:타임스탬프, C:부서, D:직종, F:연락처, G:서류내역, H:서명이미지, I:결과_안전교육, J:결과_개인정보
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!A${matchedRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[timestampStr]] }
        });
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!C${matchedRowIndex}:J${matchedRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[data.dept, data.job, sheetData[matchedRowIndex - 1][4] || data.birth, data.phone, data.docType, signatureUrl, docUrl1, docUrl2]]
          }
        });
      } else {
        // [퇴사자] A:타임스탬프, C:부서, D:직종, F:사직사유, G:출입카드, H:검사및유니폼, I:IRP, J:서류내역, K:서명이미지, L:결과_사직서, M:결과_보안서약
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!A${matchedRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[timestampStr]] }
        });
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!C${matchedRowIndex}:M${matchedRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[
              data.dept, data.job, sheetData[matchedRowIndex - 1][4] || data.resignDate, data.resignReason,
              data.checkCard, data.checkUniform, data.checkIrp, data.docType, signatureUrl, docUrl1, docUrl2
            ]]
          }
        });
      }
      console.log(`[SheetsDB] Record updated in ${sheetName} at row ${matchedRowIndex}`);
    } else {
      // 기존 행이 없는 경우: 신규 행 추가 (Append)
      let rowValues;
      if (!isOffboarding) {
        rowValues = [timestampStr, data.name, data.dept, data.job, data.birth, data.phone, data.docType, signatureUrl, docUrl1, docUrl2];
      } else {
        rowValues = [
          timestampStr, data.name, data.dept, data.job, data.resignDate, data.resignReason,
          data.checkCard, data.checkUniform, data.checkIrp, data.docType, signatureUrl, docUrl1, docUrl2
        ];
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `'${sheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowValues] }
      });
      console.log(`[SheetsDB] New record appended to ${sheetName}`);
    }
  }
}
