Transbank::Webpay.configure do |config|
  
   if Rails.env.production?

    config.wsdl_transaction_url = 'https://webpay3g.transbank.cl/WSWebpayTransaction/cxf/WSWebpayService?wsdl'
    config.wsdl_nullify_url     = 'https://webpay3g.transbank.cl/WSWebpayTransaction/cxf/WSCommerceIntegrationService?wsdl'
    config.key_path             = Rails.root + "public/597034221898_NORMAL_CLP/597034221898.key"
    config.cert_path            = Rails.root + "public/597034221898_NORMAL_CLP/597034221898.crt"
    config.server_cert_path     = Rails.root + "public/597034221898_NORMAL_CLP/tbk.crt"
   
    
    config.commerce_code        = '597034221898'
  else

   config.wsdl_transaction_url = 'https://webpay3gint.transbank.cl/WSWebpayTransaction/cxf/WSWebpayService?wsdl'
   config.wsdl_nullify_url     = 'https://webpay3gint.transbank.cl/WSWebpayTransaction/cxf/WSCommerceIntegrationService?wsdl'
   config.key_path             = Rails.root + "public/private_key_develop.key"
   config.cert_path            = Rails.root + "public/public_cert_develop.crt"
   config.server_cert_path     = Rails.root + "public/tbk_develop.crt"
   config.commerce_code        = '597020000541'
 end
  

  # Endpoints integración:
  # Normal - Mall - Diferida (Solo Autorizacion): https://webpay3gint.transbank.cl/WSWebpayTransaction/cxf/WSWebpayService?wsdl
  # Oneclick: https://webpay3gint.transbank.cl/webpayserver/wswebpay/OneClickPaymentService?wsdl
  # Completa: https://webpay3gint.transbank.cl/WSWebpayTransaction/cxf/WSCompleteWebpayService?wsdl
  # Anulacion - Diferida (Solo Captura): https://webpay3gint.transbank.cl/WSWebpayTransaction/cxf/WSCommerceIntegrationService?wsdl
  # config.commerce_code        = '34221898'

  

  # These are the default options for Net::HTTP
  # config.http_options = { read_timeout: 80 }

  # ignores any exception passed as argument
  # not capture any exception: config.rescue_exceptions []
  # Default is:
  #  [
  #   Net::ReadTimeout, Timeout::Error, Errno::EINVAL, Errno::ECONNRESET,
  #   EOFError,	Net::HTTPBadResponse, Net::HTTPHeaderSyntaxError, Net::ProtocolError
  # ]
  # config.rescue_exceptions = [
  #   Net::ReadTimeout, Timeout::Error,
  #   Transbank::Webpay::Exceptions::InvalidSignature
  # ]
end
