# Este controlador ejecuta las acciones de KHIPU
class Client::PaymentsController < ApplicationController
	skip_before_action :verify_authenticity_token
  before_action :set_order, only: [:create]

  def create
  	if user_signed_in?
		select_urls
		@order.user = current_user
		@order.order_status_id = 2
		@order.save
		session[:order_id] = nil
		client = Khipu::PaymentsApi.new()
		response = client.payments_post("Compra realizada en Drinkscity", 'CLP', @order.subtotal , {
		    transaction_id: @order.id,
		    expires_date: DateTime.current.end_of_day,
		    body: 'Total de la orden',
		    return_url: @return_url,
		    cancel_url: @cancel_url,
		    notify_api_version: '1.3'
		})
		@order.payment_id = response.payment_id
		@order.save
		redirect_to response.payment_url
	else
		redirect_to new_user_session_path(cart: true)
	end
  end

  def status
  	payment_id = params[:payment_id]
  	api    = Khipu::PaymentsApi.new()
		status = api.payments_id_get(payment_id)
		redirect_to orden_path(id: params[:id])
  end

  def confirm

  	notification_token = params[:notification_token]
		client    = Khipu::PaymentsApi.new
		response  = client.payments_get(notification_token)

		if response.status == 'done'
    #if true
			redirect_to aprobar_orden_path(id: params[:id])
		else
			redirect_to orden_path(params[:id]), :alert => "Orden no verificada, por favor intente mas tarde"

		end

		print response
		 # response keys:
		 #   [
		 #     :payment_id, :payment_url, :simplified_transfer_url, :transfer_url,
		 #     :app_url, :ready_for_terminal, :subject, :amount, :currency, :status,
		 #     :status_detail, :body, :picture_url, :receipt_url, :return_url,
		 #     :cancel_url, :notify_url, :notify_api_version, :expires_date,
		 #     :attachment_urls, :bank, :bank_id, :payer_name, :payer_email,
		 #     :personal_identifier, :bank_account_number, :out_of_date_conciliation,
		 #     :transaction_id, :custom, :responsible_user_email, :send_reminders, :send_email
		 #   ]
  end

  def select_urls
  	if Rails.env.production?
      #production
      # @return_url = "http://www.drinkscity.cl/orden/#{@order.id}"
      # @cancel_url = "http://www.drinkscity.cl"
      @return_url = "https://drinkscity.cl/orden/#{@order.id}"
      @cancel_url = "https://drinkscity.cl"
    else
      #development
      @return_url = "http://localhost:3000/orden/#{@order.id}"
      @cancel_url = "http://localhost:3000"
    end
  end

  def add_address
		@order = Order.find(current_order.id)
		@order.recipient_name = params[:recipient_name]
		@order.address = params[:address]
		@order.save
		redirect_to cart_index_path, :alert => "Datos de envio agregados con éxito."
	end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_order
      @order = Order.find(params[:id])
    end

end
