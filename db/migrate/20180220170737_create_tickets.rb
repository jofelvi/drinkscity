class CreateTickets < ActiveRecord::Migration[5.1]
  def change
    create_table :tickets do |t|
      t.references :event, foreign_key: true
      t.string :name
      t.float :price
      t.integer :stock
      t.integer :kind
      t.boolean :active
      t.datetime :start_date
      t.datetime :end_date
      t.attachment :image


      t.timestamps
    end
  end
end
