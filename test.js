const QiniuManager = require('./src/utils/QiniuManager');
const path = require('path')

const accessKey = 'zw7Vid374fFE9xrSAxoXoxnUiD0Mr4gPGQy3rZIE'
const secretKey = 'POgStlxfVxerI_XWLqKe60rpPx-ChULaBbtDdmqG'
const localFile = "E:\\myCode\\react\\cloud-doc2\\README.md";
const key='README.md';
// const downloadPath = path.join(__dirname, key)
// 文件上传
const manager = new QiniuManager(accessKey, secretKey, 'clouddoc6')
// manager.uploadFile(key, localFile)
// manager.deleteFile('README1.md').then((data) => {
//   console.log(data)
// })
manager.uploadFile(key, localFile).then((data) => {
  console.log('上传成功', data)
}).catch((err) => {
  console.error(err)
})
// manager.getBucketDomain().then((data) => {
//   console.log(data)
// })

// var publicBucketDomain = 'http://rv67k84ld.hd-bkt.clouddn.com';
// // 公开空间访问链接
// var publicDownloadUrl = bucketManager.publicDownloadUrl(publicBucketDomain, key);
// console.log(publicDownloadUrl);

// manager.generateDownloadLink(key).then(data => {
//   console.log(data)
//   return manager.generateDownloadLink('first.md')
// }).then(data => {
//   console.log(data)
// })

// manager.downloadFile(key, downloadPath).then(res => {
//   console.log(res, '下载成功--')
// })
