Transbank::Webpay.configure do |config|
  config.wsdl_transaction_url = 'https://webpay3g.transbank.cl/WSWebpayTransaction/cxf/WSWebpayService?wsdl'
  config.wsdl_nullify_url     = 'https://webpay3g.transbank.cl/WSWebpayTransaction/cxf/WSCommerceIntegrationService?wsdl'
  config.key_path             = Rails.root + "public/597034221898_NORMAL_CLP/597034221898.key"
  config.cert_path            = Rails.root + "public/597034221898_NORMAL_CLP/597034221898.crt"
  config.server_cert_path     = Rails.root + "public/597034221898_NORMAL_CLP/597034221898.csr"
 
  #config.cert_path            = '/home/oscarjosecostero/app2/public/597020000541_NORMAL_CLP/tbk.pem'
  #config.server_cert_path     = '/home/oscarjosecostero/app2/public/597020000541_NORMAL_CLP/597020000541.crt'
  config.commerce_code        = '597034221898'
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
