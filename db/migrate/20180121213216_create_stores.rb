class CreateStores < ActiveRecord::Migration[5.1]
  def change
    create_table :stores do |t|
      t.float :longitude
      t.float :latitude
      t.string :address
      t.integer :kind
      t.integer :status
      t.boolean :delivery
      t.string :name
      t.text :description
      t.string :rut
      t.string :phone
      t.string :email
      t.integer :region
      t.string :days_opened
      t.string :time_opened
      t.string :legal_agent
      t.string :legal_agent_rut
      t.string :legal_agent_phone
      t.string :legal_agent_email
      t.attachment :logo
      t.timestamps
    end
  end
end
