# Firma üyeliği ve yetki modeli — staging geçişi

## Model

Platform yöneticisi `User.role=SUPERADMIN` olarak sistem seviyesinde kalır. Firma erişimi `CompanyMembership` ile kurulur. Her üyelik tek bir firmaya, o firmaya ait role ve veri kapsamına bağlıdır. İzinler `CompanyRolePermission` satırlarında işlem bazında tutulur.

Kısıtlı kapsamda aynı türdeki seçimler **VEYA**, farklı kapsam türleri **VE** davranışı gösterir. Örneğin iki şube seçimi iki şubeden birini; şube ile departman birlikte seçimi ise seçilen şubelerden ve seçilen departmanlardan birinde olmayı gerektirir. Boş `RESTRICTED`, `NONE` ve personel bağlantısı olmayan `OWN` kapsamı hiçbir kayıt döndürmez. `COMPANY` firmanın tamamıdır.

## Staging veri geçişi

`npm run rbac:migrate:staging` yalnızca veritabanı adında `staging` geçtiğinde çalışır:

1. Her firma için sekiz hazır rolü idempotent oluşturur.
2. Eski `COMPANY_ADMIN` + `UserCompanyAccess` kayıtlarını, eski erişimi daraltmadan `Firma sahibi / COMPANY` üyeliğine eşler.
3. Eski `UserDeviceAccess` kayıtlarını üyeliğin cihaz kapsamına taşır.
4. Personeldeki metin şube/departman adlarını aynı firmadaki kimliklerle eşler.
5. Birden çok eşleşme bulunan belirsiz personelleri raporlar; tahmin etmez.

Geçiş token, parola veya cihaz anahtarı yazdırmaz ve audit kaydına sır eklemez.

## Doğrulama

- Geçiş raporundaki `ambiguousEmployees` boş olmalıdır; doluysa kayıtlar panelden açıkça bağlanır.
- Her eski firma yöneticisinin en az bir aktif üyeliği ve aktif OWNER rolü olmalıdır.
- Her firma en az bir aktif OWNER üyeliğine sahip olmalıdır.
- Askıya alınmış üyelikle eski oturumun sayfa/API erişimi reddedilmelidir.

## Geri dönüş

Canlı geçiş bu görevde yapılmaz. Staging geri dönüşünde uygulama önce önceki commit'e alınır. Yeni tablolar eski `User.companyId`, `UserCompanyAccess` ve `UserDeviceAccess` tablolarını değiştirmediği için eski uygulama çalışmaya devam eder. Yeni RBAC tabloları ancak doğrulama ve yedek sonrasında ayrıca kaldırılır; otomatik silme komutu yoktur.
