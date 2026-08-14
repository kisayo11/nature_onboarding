/**
 * Google Docs API & PDF 변환 서비스
 * - Docs 템플릿 복사 및 {{태그}} 치환
 * - PDF 생성 및 지정된 연도별 폴더로 배치
 * - 작업 완료 후 임시 gdoc 복사본 자동 삭제 (Trash)
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

export class GoogleDocsService {
  constructor(auth, driveService) {
    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
    this.driveService = driveService;
  }

  async generateDocAndConvertToPdf({
    templateId,
    docLabel,
    name,
    dept,
    job,
    birth,
    phone,
    resignDate,
    resignReason,
    signatureUrl,
    timestamp,
    destFolderId,
    docsDestFolderId
  }) {
    // 1. 템플릿 복사 (Docs 보관 폴더에 직접 생성)
    const dateStr = new Date(timestamp || Date.now()).toLocaleDateString('ko-KR');
    const fileName = `${name}_${dept}_${docLabel}_${dateStr.replace(/\. /g, '.').replace(/\.$/, '')}`;
    const targetDocsFolder = docsDestFolderId || destFolderId;

    const copyRes = await this.drive.files.copy({
      fileId: templateId,
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [targetDocsFolder]
      }
    });

    const tempDocId = copyRes.data.id;

    // 2. 텍스트 치환 요청 준비
    const requests = [
      { replaceAllText: { containsText: { text: '{{이름}}', matchCase: true }, replaceText: name || '' } },
      { replaceAllText: { containsText: { text: '{{성명}}', matchCase: true }, replaceText: name || '' } },
      { replaceAllText: { containsText: { text: '{{소속}}', matchCase: true }, replaceText: dept || '' } },
      { replaceAllText: { containsText: { text: '{{부서}}', matchCase: true }, replaceText: dept || '' } },
      { replaceAllText: { containsText: { text: '{{직종}}', matchCase: true }, replaceText: job || '' } },
      { replaceAllText: { containsText: { text: '{{직위}}', matchCase: true }, replaceText: job || '' } },
      { replaceAllText: { containsText: { text: '{{생년월일}}', matchCase: true }, replaceText: birth || '' } },
      { replaceAllText: { containsText: { text: '{{연락처}}', matchCase: true }, replaceText: phone || '' } },
      { replaceAllText: { containsText: { text: '{{사직일}}', matchCase: true }, replaceText: resignDate || '' } },
      { replaceAllText: { containsText: { text: '{{사직사유}}', matchCase: true }, replaceText: resignReason || '' } },
      { replaceAllText: { containsText: { text: '{{날짜}}', matchCase: true }, replaceText: dateStr } }
    ];

    await this.docs.documents.batchUpdate({
      documentId: tempDocId,
      requestBody: { requests }
    });

    // 3. PDF로 Export 및 02_서류보관 폴더에 저장
    const pdfExport = await this.drive.files.export({
      fileId: tempDocId,
      mimeType: 'application/pdf'
    }, { responseType: 'arraybuffer' });

    const pdfBuffer = Buffer.from(pdfExport.data);
    const pdfFile = await this.drive.files.create({
      requestBody: {
        name: `${fileName}.pdf`,
        parents: [destFolderId]
      },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(pdfBuffer)
      },
      supportsAllDrives: true,
      fields: 'id, webViewLink'
    });

    console.log(`[DocsPreserved] 원본 Docs 문서가 '03_원본서류'에 안전하게 보관되었습니다: ${fileName}`);
    return pdfFile.data.webViewLink || `https://drive.google.com/file/d/${pdfFile.data.id}/view`;
  }

}
