class Client::WebpayController < ApplicationController
  skip_before_action :verify_authenticity_token
  layout "client"

  def init_transaction
    if user_signed_in?
      select_urls
      @order = Order.find(params[:id])
      @transaction = Transbank::Webpay.init_transaction({
        buy_order:  @order.format_buyorder,
        session_id: @order.id,
        return_url: @return_url,
        final_url:  @final_url,
        amount:     @order.subtotal,
      })
      puts @transaction.inspect
      @order.payment_id = @transaction.token
      @order.order_status_id = 2
      @order.save
    else
			redirect_to new_user_session_path(cart: true)
		end
  end

  def return
    @order = Order.find_by(payment_id: params[:token_ws])
    @transaction = Transbank::Webpay.get_transaction_result(params[:token_ws])
    Transbank::Webpay.acknowledge_transaction(params[:token_ws])

    @order.amount = @transaction.detail_output.amount
    @order.buy_order = @transaction.detail_output.buy_order
    @order.authorization_code = @transaction.detail_output.authorization_code
    @order.payment_type_code = @transaction.detail_output.payment_type_code
    @order.response_code = @transaction.detail_output.response_code
    @order.transaction_date = @transaction.transaction_date
    @order.save

    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@ WEBPAY @@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p @transaction.inspect
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"

    if @transaction.valid?
      # if response.valid?
        @valid_transaction = true
        redirect_to aprobar_orden_path(id: @order.id)
      # end
    else
      redirect_to cart_index_path, alert: "Disculpe, su pago no se realizo con exito, por favor intente nuevamente mas tarde"
    end
  end

  def final
    @order = Order.find_by(payment_id: params[:token_ws])
    if params[:TBK_TOKEN].present?
      @transaction = Transbank::Webpay.get_transaction_result(params[:token_ws])
      puts @transaction.inspect
      redirect_to cart_index_path, alert: "Disculpe, su pago no se realizo con exito, por favor intente nuevamente mas tarde"
    else
      redirect_to aprobar_orden_path(id: @order.id )
    end
  end

  def nulify
  end

  def select_urls
    if Rails.env.production?
      #production
      # @return_url = 'http://www.drinkscity.cl:36521/webpay/return'
      # @final_url =  'http://www.drinkscity.cl:36521/webpay/final'
      
      # Old links
      #@return_url = "https://drinkscitys.herokuapp.com/webpay/return"
      #@final_url = "https://drinkscitys.herokuapp.com/webpay/final"


      @return_url = "https://drinkscity.cl/webpay/return"
      @final_url = "https://drinkscity.cl/webpay/final"
    else
      #development
      @return_url = 'http://localhost:3000/webpay/return'
      @final_url =  'http://localhost:3000/webpay/final'
    end

  end

end
