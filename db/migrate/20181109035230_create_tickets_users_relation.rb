class CreateTicketsUsersRelation < ActiveRecord::Migration[5.1]
  def change
    create_table :tickets_users do |t|
      t.belongs_to :user, index: true
      t.belongs_to :ticket, index: true
    end
  end
end
