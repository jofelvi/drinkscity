class CreateOrders < ActiveRecord::Migration[5.1]
  def change
    create_table :orders do |t|
      t.references :store
      t.references :user, foreign_key: true
      t.references :order_status, foreign_key: true
      t.decimal :subtotal, precision: 12, scale: 3
      t.decimal :tax, precision: 12, scale: 3
      t.decimal :shipping, precision: 12, scale: 3
      t.string :payment_id
      t.string :buy_order
      t.boolean :validated, default: false
      t.integer :validator_id

      t.timestamps
    end
  end
end
