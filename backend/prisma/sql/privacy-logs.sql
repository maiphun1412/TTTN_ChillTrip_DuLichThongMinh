/*
  ChillTrip Privacy - nhật ký truy cập và nhật ký thao tác (chỉ ghi thêm)

  Chạy file này trên database của bạn (SSMS: mở file, chọn đúng database, bấm Execute;
  hoặc: sqlcmd -S <server> -d <database> -E -i backend/prisma/sql/privacy-logs.sql).
  Chạy lại nhiều lần vẫn an toàn.

  1. Tạo bảng privacy_access_logs nếu chưa có (khớp với model trong schema.prisma).
  2. Gắn trigger chặn UPDATE/DELETE cho privacy_access_logs và audit_logs.

  Giới hạn đã biết: người có quyền sysadmin vẫn có thể DISABLE TRIGGER hoặc TRUNCATE.
*/

IF OBJECT_ID(N'dbo.privacy_access_logs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.privacy_access_logs (
    id                     BIGINT        NOT NULL IDENTITY(1,1),
    accessor_user_id       BIGINT        NULL,
    accessor_role          VARCHAR(30)   NULL,
    data_owner_user_id     BIGINT        NULL,
    data_owner_customer_id BIGINT        NULL,
    data_type              VARCHAR(50)   NOT NULL,
    action                 VARCHAR(30)   NOT NULL CONSTRAINT DF_privacy_access_logs_action DEFAULT 'VIEW',
    result                 VARCHAR(10)   NOT NULL,
    reason                 NVARCHAR(255) NULL,
    purpose                VARCHAR(50)   NULL,
    departure_id           BIGINT        NULL,
    booking_id             BIGINT        NULL,
    ip_address             VARCHAR(50)   NULL,
    created_at             DATETIME2     NOT NULL CONSTRAINT DF_privacy_access_logs_created_at DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_privacy_access_logs PRIMARY KEY CLUSTERED (id)
  );

  CREATE NONCLUSTERED INDEX IX_privacy_access_logs_created_at ON dbo.privacy_access_logs (created_at);
  CREATE NONCLUSTERED INDEX IX_privacy_access_logs_accessor ON dbo.privacy_access_logs (accessor_user_id);
  CREATE NONCLUSTERED INDEX IX_privacy_access_logs_owner ON dbo.privacy_access_logs (data_owner_user_id);
END
GO

CREATE OR ALTER TRIGGER dbo.trg_privacy_access_logs_append_only
ON dbo.privacy_access_logs
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51000, N'privacy_access_logs chỉ được ghi thêm, không được sửa hoặc xóa.', 1;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_audit_logs_append_only
ON dbo.audit_logs
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'audit_logs chỉ được ghi thêm, không được sửa hoặc xóa.', 1;
END
GO
