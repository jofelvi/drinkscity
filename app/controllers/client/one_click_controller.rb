class Client::OneClickController < ApplicationController
  skip_before_action :verify_authenticity_token
  layout "client"
  before_action :finish

  def init_inscription
    @order = Order.find(params[:id])
    if user_signed_in?
      if current_user.oneclick_user.present?
        #si ya esta subscrito solo entra autorizar el pago
        authorize
      else
        #inicia una subscripcion
        select_url
        @inscription = Transbank::Oneclick.init_inscription({
                                                              email: current_user.email,
                                                              username: current_user.email,
                                                              response_url: @response_url,
        })
        puts @inscription.inspect



      end
    else
      redirect_to new_user_session_path(cart: true)
    end

  end

  def finish_inscription
    #finaliza la subscripcion
    @inscription = Transbank::Oneclick.finish_inscription(params[:TBK_TOKEN])
    puts @inscription.inspect
    if @inscription.valid?
      current_user.oneclick_user = @inscription.tbk_user
      current_user.save
      #si se logra susbcribir solo regresa al carro no hace el cobro
      redirect_to cart_index_path, alert: "Usted se ha afiliado a oneclick con exito"
    else
      redirect_to cart_index_path, alert: "Hubo un problema, no se ha podido afiliar, intente nuevamente mas tarde"
    end
  end

  def remove_user
    response = Transbank::Oneclick.remove_user({
                                                 tbk_user: current_user.oneclick_user,
                                                 username: current_user.email
    })
    puts response.inspect
    if response.valid?
      current_user.oneclick_user = nil
      current_user.save
      redirect_to cart_index_path, alert: "Usted se ha desafiliado de oneclick con exito"
    else
      redirect_to cart_index_path, alert: "Ha ocurrido un error, por favor intente mas tarde"
    end
  end

  def authorize
    #se autoriza el cobro con el monto a pagar
    @order.buy_order = @order.format_buyorder
    @order.save
    @transaction = Transbank::Oneclick.authorize({
                                                   amount: @order.subtotal,
                                                   tbk_user: current_user.oneclick_user,
                                                   username: current_user.email,
                                                   buy_order: @order.buy_order
    })

    @order.payment_id = @transaction.try(:transaction_id)
    @order.username = current_user.try(:email)
    @order.tbk_user = current_user.try(:oneclick_user)
    @order.authorization_code = @transaction.try(:authorization_code)
    @order.response_code = @transaction.try(:response_code)
    @order.save

    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@ ONECLICK @@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p @transaction.inspect
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    p "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"

    if @transaction.valid?
      redirect_to aprobar_orden_path(id: @order.id )
    else
      redirect_to cart_index_path, alert: "Disculpe, su pago no se realizo con exito, por favor intente nuevamente mas tarde"
    end

  end

  def reverse
    @order = Order.find(params[:id])
    response = Transbank::Oneclick.reverse(@order.buy_order)
    puts response.inspect
    if response.valid?
      @order.update(order_status_id: 5)
      redirect_to ordenes_path, alert: "Se ha realizado la reversa con exito"
    else
      redirect_to orden_path(@order.id), alert: "Ha ocurrido un error, por favor intente mas tarde"
    end

  end

  def select_url
    if Rails.env.production?
      #production
      # @response_url = "http://www.drinkscity.cl:36521/one_click/finish_inscription"
      @response_url = "https://drinkscity.cl/one_click/finish_inscription"
    else
      #development
      @response_url = "http://localhost:3000/one_click/finish_inscription"
    end

  end

  def finish
    if params[:id].present?
      @finish = Order.find_by_id(params[:id])
    end

    puts "============================="
    # puts @finish
    puts "============================="
  end
end
