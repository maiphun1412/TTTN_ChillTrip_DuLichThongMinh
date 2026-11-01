/*
 * Bảng lưu trữ đồng ý chia sẻ dữ liệu cá nhân của Khách hàng (Customer Privacy Consent)
 * Phạm vi: Theo từng đơn đặt chỗ / chuyến đi hợp lệ (booking_id + customer_id)
 * Chạy an toàn nhiều lần (idempotent), không xóa dữ liệu hiện có.
 * Bảo vệ: Chỉ cho phép chạy trên database local được chỉ định (chilltrip_travel hoặc chilltrip_travel_e2e_test).
 */

IF DB_NAME() NOT IN (N'chilltrip_travel', N'chilltrip_travel_e2e_test')
BEGIN
    THROW 51010, N'Dừng thực thi: privacy-consents.sql chỉ được phép chạy trên database chilltrip_travel hoặc chilltrip_travel_e2e_test.', 1;
END;
GO

IF OBJECT_ID(N'dbo.privacy_consents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.privacy_consents (
        id              BIGINT IDENTITY(1,1) NOT NULL,
        customer_id     BIGINT               NOT NULL,
        user_id         BIGINT               NULL,
        booking_id      BIGINT               NOT NULL,
        departure_id    BIGINT               NULL,
        consent_type    VARCHAR(50)          NOT NULL
            CONSTRAINT DF_privacy_consents_type DEFAULT ('SHARE_PHONE_WITH_GUIDE'),
        status          VARCHAR(20)          NOT NULL, -- GRANTED | DENIED | REVOKED
        granted_at      DATETIME2            NULL,
        revoked_at      DATETIME2            NULL,
        ip_address      VARCHAR(50)          NULL,
        created_at      DATETIME2            NOT NULL
            CONSTRAINT DF_privacy_consents_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at      DATETIME2            NOT NULL
            CONSTRAINT DF_privacy_consents_updated_at DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_privacy_consents PRIMARY KEY CLUSTERED (id ASC),
        CONSTRAINT UQ_privacy_consents_booking_type UNIQUE (booking_id, consent_type),
        CONSTRAINT CK_privacy_consents_status CHECK (status IN ('GRANTED', 'DENIED', 'REVOKED')),
        CONSTRAINT FK_privacy_consents_customer FOREIGN KEY (customer_id)
            REFERENCES dbo.customers (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_privacy_consents_booking FOREIGN KEY (booking_id)
            REFERENCES dbo.bookings (id) ON DELETE CASCADE ON UPDATE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_privacy_consents_customer'
      AND object_id = OBJECT_ID(N'dbo.privacy_consents')
)
    CREATE NONCLUSTERED INDEX IX_privacy_consents_customer
        ON dbo.privacy_consents (customer_id, booking_id);
GO

