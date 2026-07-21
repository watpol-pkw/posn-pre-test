function doPost(e) {
  try {
    // กำหนด CORS Headers ป้องกันปัญหาการเรียกข้ามโดเมนจาก GitHub Pages
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    
    // แปลงข้อมูลที่ส่งมาแบบ JSON
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'upload') {
      const { base64Data, mimeType, filename, subject, award } = data;
      
      // 1. Get or create root folder "POSN Certificates"
      var folders = DriveApp.getFoldersByName("POSN Certificates");
      var rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder("POSN Certificates");

      // 2. Get or create subject folder
      var subjectFolders = rootFolder.getFoldersByName(subject);
      var subjectFolder = subjectFolders.hasNext() ? subjectFolders.next() : rootFolder.createFolder(subject);

      // 3. Get or create award folder
      var awardFolders = subjectFolder.getFoldersByName(award);
      var awardFolder = awardFolders.hasNext() ? awardFolders.next() : subjectFolder.createFolder(award);

      // 4. Decode base64 and create file
      var base64Str = base64Data.split(',')[1] || base64Data;
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Str), mimeType, filename);
      var file = awardFolder.createFile(blob);
      
      // 5. Set sharing to "Anyone with the link can view"
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: file.getUrl() }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === 'delete') {
      const fileUrl = data.fileUrl;
      var id = fileUrl.match(/[-\w]{25,}/);
      if (id && id[0]) {
        var file = DriveApp.getFileById(id[0]);
        file.setTrashed(true);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ต้องมี doGet เผื่อไว้ให้ Apps Script ใช้งาน Web App ได้สมบูรณ์
function doGet(e) {
  return ContentService.createTextOutput("API is running");
}
