class BuyMailer < ApplicationMailer

  def notify(order)
    @order = order;

    mail(to: [order.user.email, order.store.email], subject: 'Detalle de compra en DrinksCity')
  end

end
