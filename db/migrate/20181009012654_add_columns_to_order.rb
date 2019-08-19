class AddColumnsToOrder < ActiveRecord::Migration[5.1]
  def change
    add_column :orders, :amount, :decimal, precision: 12, scale: 3
    add_column :orders, :autorization_code, :string
    add_column :orders, :payment_type_code, :string
    add_column :orders, :responde_code, :string
    add_column :orders, :transation_date, :datetime
  end
end
