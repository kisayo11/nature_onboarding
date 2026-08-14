/**
 * Google Drive API 연동 및 연도별 체계화 폴더 구조 세팅 엔진
 * 
 * [개선된 폴더 구조]
 * ROOT / 00_서류템플릿양식
 * ROOT / 01_서명보관 / {YYYY}년
 * ROOT / 02_서류보관 / {YYYY}년 / 01_입사자서류 (Onboarding)
 * ROOT / 02_서류보관 / {YYYY}년 / 02_퇴사자서류 (Offboarding)
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

export class GoogleDriveService {
  constructor(auth) {
    this.drive = google.drive({ version: 'v3', auth });
  }

  // 1. 특정 부모 폴더 하위에서 이름으로 폴더 찾기 없으면 생성
  async getOrCreateFolder(folderName, parentFolderId) {
    try {
      const q = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const res = await this.drive.files.list({
        q,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
      }

      // 없으면 폴더 신규 생성 (requestBody 표준 사용)
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };
      const created = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        fields: 'id',
      });
      return created.data.id;
    } catch (err) {
      console.error(`Folder Creation Error [${folderName}]:`, err);
      throw err;
    }
  }

  // 2. 연도별 서명 보관 폴더 세팅 (01_서명보관 / YYYY년)
  async getSignatureFolder(rootSignatureFolderId) {
    const sigRootId = await this.getOrCreateFolder('01_서명보관', rootSignatureFolderId);
    const currentYear = `${new Date().getFullYear()}년`;
    return await this.getOrCreateFolder(currentYear, sigRootId);
  }

  // 3. 연도별 최종 PDF 서류 보관 폴더 세팅 (02_서류보관 / YYYY년 / 01_입사자서류 OR 02_퇴사자서류)
  async getDocumentDestinationFolder(rootDocsFolderId, isOffboarding = false) {
    const docsRootId = await this.getOrCreateFolder('02_서류보관', rootDocsFolderId);
    const currentYear = `${new Date().getFullYear()}년`;
    const yearFolderId = await this.getOrCreateFolder(currentYear, docsRootId);

    const subFolderName = isOffboarding ? '02_퇴사자서류' : '01_입사자서류';
    return await this.getOrCreateFolder(subFolderName, yearFolderId);
  }

  // 3-1. 연도별 수정가능 Docs 원본 서류 보관 폴더 세팅 (03_원본서류 / YYYY년 - 입/퇴사자 구분 없이 통째로 보관)
  async getDocsDestinationFolder(rootDocsFolderId) {
    const docsRootId = await this.getOrCreateFolder('03_원본서류', rootDocsFolderId);
    const currentYear = `${new Date().getFullYear()}년`;
    return await this.getOrCreateFolder(currentYear, docsRootId);
  }




  // 4. 서명 PNG 이미지 업로드
  async uploadSignatureBlob(base64Data, filename, targetFolderId) {
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fileMetadata = {
      name: filename,
      parents: [targetFolderId],
    };
    const media = {
      mimeType: 'image/png',
      body: Readable.from(buffer),
    };

    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      supportsAllDrives: true,
      fields: 'id, webViewLink',
    });

    return {
      fileId: file.data.id,
      url: `https://drive.google.com/uc?id=${file.data.id}`,
    };
  }

  // 5. 임시 gdoc 파일 🗑️ 자동 삭제 (setTrashed = true)
  async trashFile(fileId) {
    try {
      await this.drive.files.update({
        fileId: fileId,
        supportsAllDrives: true,
        requestBody: { trashed: true },
      });
      console.log(`[CleanUp] Temporary Docs file trashed successfully: ${fileId}`);
    } catch (err) {
      console.error(`Failed to trash temporary file (${fileId}):`, err);
    }
  }
}
