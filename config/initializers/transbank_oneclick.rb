Transbank::Oneclick.configure do |config|
  config.url               = "https://webpay3g.transbank.cl/webpayserver/wswebpay/OneClickPaymentService?wsdl"
  config.key_path          = Rails.root + "public/597033757425_ONECLICK/597033757425.key"
  config.cert_path         = Rails.root + "public/597033757425_ONECLICK/597033757425.crt"
  config.server_cert_path  = Rails.root + "public/597033757425_ONECLICK/tbk.pem.crt"

 # These are the default options for Net::HTTP
 # it is also possible to pass them on every request
 # reverse with read_timeout 60 seconds: Transbank::Oneclick.reverse(24575755, http_options: {read_timeout: 60})
 # Default is  {}
 # config.http_options = { read_timeout: 80 }

 # ignores any exception passed as argument
 # not capture any exception: config.rescue_exceptions []
 # Default is [Net::ReadTimeout, Timeout::Error, Errno::EINVAL, Errno::ECONNRESET, EOFError,	Net::HTTPBadResponse, Net::HTTPHeaderSyntaxError, Net::ProtocolError]
 # config.rescue_exceptions = [Net::ReadTimeout, Timeout::Error, Transbank::Oneclick::Exceptions::InvalidSignature]
end


