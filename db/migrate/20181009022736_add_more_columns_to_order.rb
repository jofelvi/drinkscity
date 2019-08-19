class AddMoreColumnsToOrder < ActiveRecord::Migration[5.1]
  def change
    rename_column :orders, :autorization_code, :authorization_code
    rename_column :orders, :responde_code, :response_code
    rename_column :orders, :transation_date, :transaction_date

    add_column :orders, :username, :string
    add_column :orders, :tbk_user, :text
  end
end
